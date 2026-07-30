import { CIDADES_ATENDIDAS, faseDoRamo } from './config';
import type { Lead } from './schema';

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

export function dentroDoRaio(cidade?: string): boolean {
  if (!cidade) return false;
  const alvo = normalizar(cidade);
  return CIDADES_ATENDIDAS.some((c) => normalizar(c) === alvo || alvo.includes(normalizar(c)));
}

function ehDecisor(lead: Lead): boolean {
  if (lead.decideSozinho !== undefined) return lead.decideSozinho;
  return ['dono', 'socio', 'sindico_morador', 'sindico_profissional', 'administradora'].includes(
    lead.papel ?? '',
  );
}

function vencimentoUrgente(lead: Lead): boolean {
  return lead.vencimento === 'vencido' || lead.vencimento === 'ate_30_dias' || lead.vencimento === 'ate_90_dias';
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
  if (lead.cidade && !dentroDoRaio(lead.cidade)) {
    motivos.push(`Fora do raio de atendimento (${lead.cidade})`);
    return { score: 'C', contaTecnica, motivos };
  }
  if (lead.papel === 'outro' && !lead.empresa) {
    motivos.push('Sem vínculo com empresa identificado — possível pessoa física');
    return { score: 'C', contaTecnica, motivos };
  }

  const decisor = ehDecisor(lead);
  if (!decisor && lead.papel) {
    motivos.push('Contato não decide a contratação');
  }

  // --- A: urgência real + decisor + ramo da Fase 1 ---
  const temFase1 = fases.includes(1);
  if (decisor && (gatilhoQuente(lead) || (temFase1 && vencimentoUrgente(lead)))) {
    if (gatilhoQuente(lead)) motivos.push('Gatilho quente: sinistro recente ou exigência de banco/contrato');
    if (temFase1 && vencimentoUrgente(lead)) motivos.push('Ramo da Fase 1 com vencimento em até 90 dias');
    motivos.push('Notificação imediata ao closer, dentro do SLA');
    return { score: 'A', contaTecnica, motivos };
  }

  // --- B: perfil certo, timing frio ---
  if (decisor && (temFase1 || fases.includes(2))) {
    motivos.push(
      lead.vencimento === 'nao_tem_seguro'
        ? 'Perfil certo, ainda sem seguro contratado'
        : 'Perfil certo, mas o vencimento está distante',
    );
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
  if (!vencimentoUrgente(lead) && !gatilhoQuente(lead)) faltando.push('sem urgência declarada');
  motivos.push(faltando.length ? `Falta: ${faltando.join('; ')}` : 'Sem sinal de prioridade');
  return { score: 'C', contaTecnica, motivos };
}
