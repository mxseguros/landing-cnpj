import type { Lead, Origem } from '../agent/schema';
import type { Resultado } from '../agent/score';
import { MX, RAMO_LABEL, RAMO_LABEL_AGRO, PUBLICO_POR_SEGMENTO } from '../agent/config';

/**
 * Ponto único de saída do lead.
 *
 * Toda entrega passa por aqui. Trocar de CRM depois (RD Station, Pipedrive, PipeFlow)
 * é trocar a implementação de uma função, não refatorar o app.
 */

export interface Entrega {
  lead: Lead;
  resultado: Resultado;
  origem: Origem;
  conversaId: string;
  /** Preenchido quando a pessoa pediu para falar com um humano. */
  escapeHumano?: string;
  /** Conversa abandonada antes de completar — entrega o que houver. */
  parcial?: boolean;
  /**
   * Veio do formulário, não do chat. Quem preenche está pedindo contato de
   * forma explícita, então a notificação não passa pelo filtro de score:
   * um lead C do formulário ainda é alguém esperando o telefone tocar.
   */
  viaFormulario?: boolean;
}

export async function deliverLead(e: Entrega): Promise<void> {
  // 1. Fonte de verdade
  await persistir(e);

  // 2. Notificação ao corretor. Score C não interrompe ninguém — fica apenas
  // registrado —, exceto quando a pessoa pediu contato de forma explícita.
  if (e.resultado.score !== 'C' || e.escapeHumano || e.viaFormulario) {
    await notificarCelula(e);
  }
}

/** TODO Fase 4 — Neon Postgres provisionado via `vercel integration`. */
async function persistir(e: Entrega): Promise<void> {
  console.info('[lead]', e.conversaId, e.resultado.score, e.resultado.motivos.join(' | '));
}

/**
 * TODO Fase 4 — Resend para e-mail.
 * O WhatsApp da célula entra no Ship 2 via Meta Cloud API; no Ship 1 o handoff é o
 * botão wa.me com o protocolo, montado no cliente por linkWhatsApp().
 */
async function notificarCelula(e: Entrega): Promise<void> {
  console.info('[notificar]', resumoParaCrm(e));
}

/**
 * Resumo estruturado para o CRM.
 * Formato definido em docs/Agente_Corretor_PJ_MX.md §6 e docs/Agente_MX_Agro.md §6.
 */
export function resumoParaCrm(e: Entrega): string {
  const { lead: l, resultado: r, origem: o } = e;
  const ehAgro = l.segmento === 'agro';
  const labels = { ...RAMO_LABEL, ...RAMO_LABEL_AGRO };
  const ramos = (l.ramos ?? []).map((x) => labels[x] ?? x).join(', ');
  const situacao = [
    l.temSeguroHoje === undefined ? null : l.temSeguroHoje ? 'tem seguro' : 'sem seguro',
    l.seguradoraAtual,
    l.vencimento && `vencimento: ${l.vencimento.replace(/_/g, ' ')}`,
    l.sinistroRecente && 'sinistro recente',
    l.temCreditoRural && 'tem custeio/financiamento em aberto',
  ]
    .filter(Boolean)
    .join(' · ');

  // O corretor do agro liga sabendo o que a pessoa planta e se a janela ainda
  // está aberta; sem isso ele abre a conversa oferecendo lavoura para quem já semeou.
  const producao = [
    l.cultura,
    l.hectares && `${l.hectares} ha`,
    l.janelaPlantio && `plantio: ${l.janelaPlantio.replace(/_/g, ' ')}`,
  ]
    .filter(Boolean)
    .join(' · ');

  const publico = PUBLICO_POR_SEGMENTO[l.segmento ?? 'empresas'];

  return [
    `LEAD ${ehAgro ? 'RURAL' : 'PJ'} — ${ehAgro ? MX.agenteAgro : MX.agente}`,
    `Protocolo: ${e.conversaId}`,
    `Score: ${r.score}${r.contaTecnica ? ' · CONTA TÉCNICA' : ''}${e.parcial ? ' · PARCIAL' : ''}`,
    `Motivo: ${r.motivos.join('; ')}`,
    '',
    `${publico === 'pj' ? 'Empresa' : 'Propriedade'} / segmento: ${l.empresa ?? '—'}${l.atividade ? ` (${l.atividade})` : ''}`,
    `Cidade: ${l.cidade ?? '—'}`,
    ehAgro ? `Produção: ${producao || '—'}` : '',
    `Ramo(s) de interesse: ${ramos || '—'}`,
    `Situação atual: ${situacao || '—'}`,
    `Gatilho de compra: ${l.gatilho ?? '—'}`,
    `Decisor: ${l.papel ?? '—'}${l.decideSozinho === false ? ' (não decide sozinho)' : ''}`,
    `Contato e melhor horário: ${l.nome ?? ''} ${l.whatsapp ?? l.email ?? '—'} ${l.melhorHorario ?? ''}`.trim(),
    `Observações: ${l.observacoes ?? '—'}`,
    e.escapeHumano ? `Pediu atendimento humano: ${e.escapeHumano}` : '',
    '',
    `Origem: ${o.utmSource ?? 'direto'} / ${o.utmMedium ?? '—'} · ${o.utmCampaign ?? '—'} · página ${o.paginaSegmento ?? '—'}`,
  ]
    .filter((linha) => linha !== '')
    .join('\n');
}

/**
 * Handoff do Ship 1: link wa.me com o protocolo já preenchido.
 * Cumpre o "cai no WhatsApp da célula" sem depender da aprovação da Meta.
 */
export function linkWhatsApp(conversaId: string, nome?: string): string {
  const texto = `Olá! Sou ${nome ?? 'cliente'} e acabei de fazer a qualificação no site. Protocolo ${conversaId}.`;
  return `https://wa.me/${MX.whatsappCelula.replace(/\D/g, '')}?text=${encodeURIComponent(texto)}`;
}
