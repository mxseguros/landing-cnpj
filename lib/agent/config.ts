/**
 * Configuração do agente MX Empresas.
 *
 * Origem: docs/Agente_Corretor_PJ_MX.md — seção "Campos a preencher antes de publicar".
 * Os valores marcados como PENDENTE precisam ser confirmados pela MX antes do go-live.
 */

export const MX = {
  corretora: 'MX Seguros',
  agente: 'MX Empresas',
  cidadeSede: 'Itapira/SP',
  desde: 2002,

  telefone: '(19) 3863-8150',
  /** PENDENTE — usar número dedicado da célula B2B, não o institucional (ver Plano.md §10). */
  whatsappCelula: '+5519386381500',
  email: 'mxseguros@mxseguros.com.br',

  /** PENDENTE — SLA acordado com a célula. Aparece na mensagem de handoff. */
  prazoRetorno: 'até o fim do próximo dia útil',
  horarioAtendimento: 'segunda a sexta, das 8h às 18h',

  /** PENDENTE — não consta no site institucional; obrigatório no rodapé. */
  cnpj: null as string | null,
  susep: null as string | null,
} as const;

/** Raio de atendimento presencial. Fora daqui o lead cai para score C. */
export const CIDADES_ATENDIDAS = [
  'Itapira',
  'Mogi Guaçu',
  'Mogi Mirim',
  'Espírito Santo do Pinhal',
  'Lindóia',
  'Águas de Lindoia',
] as const;

/**
 * Ramos por fase comercial (planejamento.docx §4).
 * A fase determina o roteamento, não se o lead é bom.
 */
export const RAMOS_POR_FASE = {
  1: ['patrimonial', 'frota', 'condominial'],
  2: ['vida_em_grupo'],
  3: ['rc', 'do', 'garantia', 'transporte', 'patrimonial_industrial', 'cyber', 'engenharia'],
} as const;

export const RAMO_LABEL: Record<string, string> = {
  patrimonial: 'Patrimonial empresarial',
  frota: 'Auto / Frota',
  condominial: 'Seguro condominial',
  vida_em_grupo: 'Vida em Grupo / Benefícios',
  rc: 'Responsabilidade Civil',
  do: 'D&O',
  garantia: 'Seguro Garantia',
  transporte: 'Transportes',
  patrimonial_industrial: 'Patrimonial industrial',
  cyber: 'Riscos cibernéticos',
  engenharia: 'Riscos de engenharia',
};

export function faseDoRamo(ramo: string): 1 | 2 | 3 {
  if ((RAMOS_POR_FASE[1] as readonly string[]).includes(ramo)) return 1;
  if ((RAMOS_POR_FASE[2] as readonly string[]).includes(ramo)) return 2;
  return 3;
}
