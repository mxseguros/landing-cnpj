import type { Segmento } from './schema';

/**
 * Configuração dos agentes da MX.
 *
 * Origem: docs/Agente_Corretor_PJ_MX.md (PJ) e docs/Agente_MX_Agro.md (rural) —
 * seção "Campos a preencher antes de publicar".
 * Os valores marcados como PENDENTE precisam ser confirmados pela MX antes do go-live.
 */

export const MX = {
  corretora: 'MX Seguros',
  agente: 'MX Empresas',
  agenteAgro: 'MX Agro',
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
 * Raio por segmento, quando ele difere do padrão.
 *
 * Propriedade rural não fica no centro da cidade: o produtor que planta a 40 km
 * de Itapira é o mesmo público, e derrubá-lo para C por endereço descartaria
 * justamente o cinturão de café e cana da região. O agro herda as seis cidades
 * padrão e soma o entorno produtivo.
 */
export const CIDADES_POR_SEGMENTO: Partial<Record<Segmento, readonly string[]>> = {
  agro: [
    ...CIDADES_ATENDIDAS,
    'São João da Boa Vista',
    'Divinolândia',
    'Aguaí',
    'Casa Branca',
    'Santo Antônio do Jardim',
    'Vargem Grande do Sul',
    'Mococa',
  ],
};

export function cidadesDoSegmento(segmento?: Segmento): readonly string[] {
  return (segmento && CIDADES_POR_SEGMENTO[segmento]) || CIDADES_ATENDIDAS;
}

/**
 * Público de cada landing.
 *
 * Existe porque a regra "sem empresa identificada é possível pessoa física, logo
 * score C" só faz sentido nas páginas B2B. No agro, propriedade no CPF do produtor
 * é a norma, não um sinal de lead ruim. Quando `/cpf` entrar, é mais uma chave aqui.
 */
export const PUBLICO_POR_SEGMENTO: Record<Segmento, 'pj' | 'pf' | 'misto'> = {
  empresas: 'pj',
  condominio: 'pj',
  frota: 'pj',
  agro: 'misto',
};

/**
 * Ramos por fase comercial (planejamento.docx §4).
 * A fase determina o roteamento, não se o lead é bom.
 *
 * ATENÇÃO: `faseDoRamo()` devolve 3 para qualquer ramo que não esteja nas listas 1 e 2,
 * e a fase 3 marca o lead como conta técnica. Ramo novo em RAMO_LABEL sem entrada aqui
 * vira conta técnica silenciosamente e infla o score — todo ramo precisa estar mapeado.
 */
export const RAMOS_POR_FASE = {
  1: [
    'patrimonial', 'frota', 'condominial',
    // Agro: volume e ciclo curto. Penhor rural entra aqui porque costuma vir com
    // prazo de banco, e máquina parada na janela de colheita não espera safra nova.
    'agricola', 'penhor_rural', 'benfeitorias', 'maquinas_agricolas',
  ],
  2: ['vida_em_grupo', 'pecuario', 'vida_produtor'],
  3: [
    'rc', 'do', 'garantia', 'transporte', 'patrimonial_industrial', 'cyber', 'engenharia',
    // Ticket alto e ciclo longo: vão ao closer sinalizados, nunca descartados.
    'florestal', 'aquicola', 'cpr',
  ],
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

/** Ramos rurais — separados porque só entram no escopo do agente do agro. */
export const RAMO_LABEL_AGRO: Record<string, string> = {
  agricola: 'Seguro agrícola (lavoura)',
  penhor_rural: 'Penhor rural',
  benfeitorias: 'Benfeitorias e produtos agropecuários',
  maquinas_agricolas: 'Máquinas e implementos agrícolas',
  pecuario: 'Seguro pecuário',
  florestal: 'Seguro de florestas',
  aquicola: 'Seguro aquícola',
  cpr: 'CPR — Cédula de Produto Rural',
  vida_produtor: 'Vida do produtor e da família',
};

export function faseDoRamo(ramo: string): 1 | 2 | 3 {
  if ((RAMOS_POR_FASE[1] as readonly string[]).includes(ramo)) return 1;
  if ((RAMOS_POR_FASE[2] as readonly string[]).includes(ramo)) return 2;
  return 3;
}
