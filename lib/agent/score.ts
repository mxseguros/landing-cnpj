import { cidadesDoSegmento, faseDoRamo, PUBLICO_POR_SEGMENTO } from './config';
import type { Lead, Segmento } from './schema';

/**
 * Motor de pontuação do lead.
 *
 * Roda em código, não no modelo de linguagem — o LLM coleta, esta função decide.
 * Um LLM atribuindo score é inauditável e muda de resposta entre execuções, o que
 * torna impossível calibrar o roteamento com o feedback do closer (PRD §RF-05).
 */

export type Score = 'A' | 'B' | 'C';

export interface Resultado {
  score: Score;
  /** Indústria ou ramo da Fase 3: ciclo longo e ticket alto. Vai ao closer sinalizado, nunca descartado. */
  contaTecnica: boolean;
  /** Por que caiu nesse score — aparece no card do corretor e serve para auditar a regra. */
  motivos: string[];
}

function normalizar(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
}

export function dentroDoRaio(cidade?: string, segmento?: Segmento): boolean {
  if (!cidade) return false;
  const alvo = normalizar(cidade);
  return cidadesDoSegmento(segmento).some(
    (c) => normalizar(c) === alvo || alvo.includes(normalizar(c)),
  );
}

function ehDecisor(lead: Lead): boolean {
  if (lead.decideSozinho !== undefined) return lead.decideSozinho;
  return [
    'dono', 'socio', 'sindico_morador', 'sindico_profissional', 'administradora',
    // No agro quem planta decide. Arrendatário não é dono da terra, mas a lavoura
    // e o custeio são dele — é ele quem contrata.
    'produtor', 'arrendatario',
  ].includes(lead.papel ?? '');
}

/**
 * O prazo que torna o lead urgente.
 *
 * Nas páginas B2B é o vencimento da apólice. No agro é o plantio: seguro de lavoura
 * costuma exigir contratação antes da semeadura, então quem semeia em até 90 dias
 * tem a mesma urgência de quem tem apólice vencendo. `ja_plantei` não entra de
 * propósito — ali a janela da lavoura provavelmente já fechou.
 */
function prazoUrgente(lead: Lead): boolean {
  const apolice =
    lead.vencimento === 'vencido' ||
    lead.vencimento === 'ate_30_dias' ||
    lead.vencimento === 'ate_90_dias';
  const plantio = lead.janelaPlantio === 'ate_30_dias' || lead.janelaPlantio === 'ate_90_dias';
  return apolice || plantio;
}

function gatilhoQuente(lead: Lead): boolean {
  return (
    lead.gatilho === 'sinistro_recente' ||
    lead.gatilho === 'exigencia_banco_contrato' ||
    lead.sinistroRecente === true
  );
}

export function pontuar(lead: Lead): Resultado {
  const motivos: string[] = [];

  const fases = (lead.ramos ?? []).map(faseDoRamo);
  const contaTecnica =
    lead.ehIndustria === true ||
    lead.faturamentoAteDezMilhoes === false ||
    fases.includes(3) ||
    (lead.funcionarios ?? 0) > 100;

  if (contaTecnica) motivos.push('Conta técnica: ticket alto e ciclo longo, tratamento da Fase 3');

  // --- desqualificadores: derrubam para C independentemente do resto ---
  if (lead.cidade && !dentroDoRaio(lead.cidade, lead.segmento)) {
    motivos.push(`Fora do raio de atendimento (${lead.cidade})`);
    return { score: 'C', contaTecnica, motivos };
  }
  // Só vale nas páginas B2B: em `/agro` a propriedade no CPF do produtor é a norma,
  // e esta regra descartaria justamente o público da página.
  const publico = PUBLICO_POR_SEGMENTO[lead.segmento ?? 'empresas'];
  if (publico === 'pj' && lead.papel === 'outro' && !lead.empresa) {
    motivos.push('Sem vínculo com empresa identificado — possível pessoa física');
    return { score: 'C', contaTecnica, motivos };
  }

  const decisor = ehDecisor(lead);
  if (!decisor && lead.papel) {
    motivos.push('Contato não decide a contratação');
  }

  // --- A: urgência real + decisor + ramo da Fase 1 ---
  const temFase1 = fases.includes(1);
  if (decisor && (gatilhoQuente(lead) || (temFase1 && prazoUrgente(lead)))) {
    if (gatilhoQuente(lead)) motivos.push('Gatilho quente: sinistro recente ou exigência de banco/contrato');
    if (temFase1 && prazoUrgente(lead)) {
      motivos.push(
        lead.janelaPlantio === 'ate_30_dias' || lead.janelaPlantio === 'ate_90_dias'
          ? 'Ramo da Fase 1 com plantio em até 90 dias — janela de contratação aberta'
          : 'Ramo da Fase 1 com vencimento em até 90 dias',
      );
    }
    motivos.push('Notificação imediata ao closer, dentro do SLA');
    return { score: 'A', contaTecnica, motivos };
  }

  // --- B: perfil certo, timing frio ---
  if (decisor && (temFase1 || fases.includes(2))) {
    if (lead.janelaPlantio === 'ja_plantei') {
      // O corretor precisa saber disso antes de ligar: oferecer lavoura para quem já
      // semeou queima a conversa. O que continua em aberto é benfeitoria, máquina,
      // rebanho e vida — e a lavoura volta a valer na safra seguinte.
      motivos.push('Safra já plantada: janela da lavoura provavelmente fechada, abordar pelos demais ramos');
    } else {
      motivos.push(
        lead.vencimento === 'nao_tem_seguro'
          ? 'Perfil certo, ainda sem seguro contratado'
          : 'Perfil certo, mas o prazo está distante',
      );
    }
    return { score: 'B', contaTecnica, motivos };
  }

  // Conta técnica sem urgência ainda merece a fila do hunter, não o descarte.
  if (contaTecnica) {
    motivos.push('Encaminhado ao closer pelo porte, mesmo sem urgência declarada');
    return { score: 'B', contaTecnica, motivos };
  }

  // Enumera o que realmente falta. Um motivo genérico faria o closer
  // descartar lead que só está incompleto — o formulário, por exemplo, não
  // pergunta quem decide, mas pode trazer vencimento para o mês que vem.
  const faltando: string[] = [];
  if (!decisor) faltando.push('quem decide não identificado');
  if (!temFase1 && !fases.includes(2)) faltando.push('ramo de interesse não informado');
  if (!prazoUrgente(lead) && !gatilhoQuente(lead)) faltando.push('sem urgência declarada');
  motivos.push(faltando.length ? `Falta: ${faltando.join('; ')}` : 'Sem sinal de prioridade');
  return { score: 'C', contaTecnica, motivos };
}
