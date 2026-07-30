import { z } from 'zod';

/**
 * Schema do lead PJ coletado pelo agente MX Empresas.
 *
 * Origem: docs/Agente_Corretor_PJ_MX.md §5 (fluxo de qualificação) e §6 (resumo para o CRM),
 * cruzado com docs/PRD.md §RF-04.
 *
 * Quase tudo é opcional de propósito: o documento manda conduzir a conversa naturalmente e
 * fazer o handoff assim que houver o essencial — o que precisa proteger, a situação atual
 * e o contato. Campo obrigatório aqui viraria interrogatório na conversa.
 */

export const segmentoEnum = z.enum(['empresas', 'condominio', 'frota']);
export type Segmento = z.infer<typeof segmentoEnum>;

export const papelEnum = z.enum([
  'dono',
  'socio',
  'sindico_morador',
  'sindico_profissional',
  'administradora',
  'gestor',
  'conselho',
  'outro',
]);

export const gatilhoEnum = z.enum([
  'renovacao',
  'sinistro_recente',
  'exigencia_banco_contrato',
  'pesquisa_inicial',
]);

export const vencimentoEnum = z.enum([
  'vencido',
  'ate_30_dias',
  'ate_90_dias',
  'mais_de_90_dias',
  'nao_tem_seguro',
  'nao_sabe',
]);

export const leadSchema = z.object({
  // --- quem é (doc §5.1) ---
  nome: z.string().optional().describe('Primeiro nome de quem está falando'),
  empresa: z.string().optional().describe('Nome da empresa ou do condomínio'),
  segmento: segmentoEnum.optional(),
  atividade: z.string().optional().describe('Ramo de atividade em linguagem natural, ex.: "restaurante", "oficina"'),
  cidade: z.string().optional(),

  // --- o que precisa proteger (doc §5.2) ---
  ramos: z.array(z.string()).optional().describe('Chaves de RAMO_LABEL que interessam ao cliente'),

  // --- situação atual (doc §5.3) ---
  temSeguroHoje: z.boolean().optional(),
  seguradoraAtual: z.string().optional(),
  vencimento: vencimentoEnum.optional().describe('Quando vence a apólice atual — campo que mais pesa no roteamento'),
  sinistroRecente: z.boolean().optional(),

  // --- gatilho e decisão (doc §5.4 e §5.5) ---
  gatilho: gatilhoEnum.optional(),
  papel: papelEnum.optional(),
  decideSozinho: z.boolean().optional(),

  // --- porte ---
  funcionarios: z.number().int().nonnegative().optional(),
  unidades: z.number().int().nonnegative().optional().describe('Condomínio: número de unidades'),
  veiculos: z.number().int().nonnegative().optional().describe('Frota: número de veículos'),
  faturamentoAteDezMilhoes: z.boolean().optional(),
  ehIndustria: z.boolean().optional(),

  // --- contato (doc §5.6) ---
  whatsapp: z.string().optional(),
  email: z.string().optional(),
  melhorHorario: z.string().optional(),

  // --- conformidade ---
  consentimentoLgpd: z.boolean().optional(),

  observacoes: z.string().optional().describe('Qualquer contexto útil que o corretor deva saber'),
});

export type Lead = z.infer<typeof leadSchema>;

/** Origem de campanha — capturada da URL, não perguntada ao usuário (PRD §RF-09). */
export const origemSchema = z.object({
  utmSource: z.string().optional(),
  utmMedium: z.string().optional(),
  utmCampaign: z.string().optional(),
  referrer: z.string().optional(),
  paginaSegmento: segmentoEnum.optional(),
});
export type Origem = z.infer<typeof origemSchema>;

/**
 * O documento (§5) define o mínimo para handoff: o que proteger, situação atual e contato.
 */
export function temOEssencial(lead: Lead): boolean {
  const oQueProteger = Boolean(lead.ramos?.length || lead.atividade || lead.segmento);
  const situacao = lead.temSeguroHoje !== undefined || lead.vencimento !== undefined;
  const contato = Boolean(lead.whatsapp || lead.email);
  return oQueProteger && situacao && contato;
}
