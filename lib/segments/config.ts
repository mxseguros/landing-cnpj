import type { Segmento } from '../agent/schema';

/**
 * Configuração por segmento.
 *
 * Toda a diferença entre `/empresas`, `/condominio` e `/frota` mora aqui —
 * copy, dores, coberturas, foto e metadata. O template em
 * `app/[segmento]/page.tsx` não conhece nenhum segmento pelo nome.
 *
 * Adicionar um segmento novo (`/agronegocio`, por exemplo) é acrescentar uma
 * entrada neste objeto e a chave correspondente em `segmentoEnum` e em
 * `FOCO_POR_SEGMENTO` (lib/agent/prompt.ts). Nenhum componente muda.
 */

export interface Cenario {
  titulo: string;
  texto: string;
}

export interface ConfigSegmento {
  slug: Segmento;
  nav: string;
  /** Gatilho de urgência do hero — consequência real, nunca escassez inventada. */
  urgencia: string;
  eyebrow: string;
  titulo: string;
  subtitulo: string;
  cta: string;
  foto: string;
  fotoAlt: string;
  cenariosTitulo: string;
  cenariosLede: string;
  cenarios: Cenario[];
  coberturasTitulo: string;
  coberturas: string[];
  meta: { title: string; description: string };
}

export const SEGMENTOS: Record<Segmento, ConfigSegmento> = {
  empresas: {
    slug: 'empresas',
    nav: 'Comércio e serviços',
    urgencia: 'Vencimento chegando',
    eyebrow: 'Seguro empresarial · Itapira e região',
    titulo: 'Depois do vencimento, o prejuízo é todo seu.',
    subtitulo:
      'Renovação de seguro empresarial não se resolve no dia. A MX cota nas principais seguradoras e responde no mesmo dia — comece antes que a data chegue.',
    cta: 'Ver meu cenário em 3 minutos',
    foto: '/hero/empresas.jpg',
    fotoAlt: 'Comerciante no balcão do próprio estabelecimento',
    cenariosTitulo: 'Situações que a gente vê toda semana em Itapira',
    cenariosLede:
      'Se alguma delas soa familiar, a conversa leva três minutos e você já sai sabendo o próximo passo.',
    cenarios: [
      { titulo: 'Renovou no automático', texto: 'Você paga a mesma apólice há anos sem saber se a cobertura acompanhou o crescimento do negócio.' },
      { titulo: 'O banco exigiu, e é para ontem', texto: 'Liberação de crédito ou assinatura de contrato travada esperando uma apólice específica.' },
      { titulo: 'Cotou por telefone e virou protocolo', texto: 'Ligou num 0800, passou seus dados para um atendente distante e ninguém nunca apareceu na sua loja.' },
      { titulo: 'Tem veículo rodando fora do radar', texto: 'Carro de entrega, van, utilitário: frota pequena costuma ficar de fora do planejamento de risco.' },
      { titulo: 'Estoque cresceu, apólice não', texto: 'O valor segurado é o de três anos atrás. No sinistro, a indenização vem proporcional ao que está escrito na apólice, não ao que existe na prateleira.' },
      { titulo: 'Reforma sem aviso à seguradora', texto: 'Obra no ponto comercial muda o risco e costuma exigir comunicação prévia. Quase ninguém lembra disso na hora de quebrar a parede.' },
      { titulo: 'Funcionário sem seguro de vida', texto: 'Várias convenções coletivas exigem vida em grupo para a categoria, e a fiscalização cobra — vira passivo trabalhista sem ninguém perceber.' },
      { titulo: 'Sistema fora do ar por invasão', texto: 'Maquininha, sistema de vendas, cadastro de cliente: quando cai por ataque, o prejuízo é de operação parada, não de equipamento quebrado.' },
    ],
    coberturasTitulo: 'O que dá para proteger na sua empresa',
    coberturas: [
      'Patrimonial empresarial', 'Responsabilidade civil', 'Vida em grupo',
      'Riscos cibernéticos', 'Engenharia', 'Transporte de carga',
      'Seguro garantia', 'Agronegócio',
    ],
    meta: {
      title: 'Seguro empresarial em Itapira | MX Seguros',
      description:
        'Corretora de Itapira desde 2002. Cotação em várias seguradoras e resposta no mesmo dia para comércio, serviços e indústria da região.',
    },
  },

  condominio: {
    slug: 'condominio',
    nav: 'Condomínio',
    urgencia: 'Obrigação legal',
    eyebrow: 'Seguro condominial · Itapira e região',
    titulo: 'Condomínio sem seguro vigente cai no colo do síndico.',
    subtitulo:
      'A lei exige seguro contra incêndio e destruição em todo condomínio edilício. Se a apólice venceu e algo acontece, a cobrança de responsabilidade chega antes da seguradora.',
    cta: 'Levar um comparativo à assembleia',
    foto: '/hero/condominio.jpg',
    fotoAlt: 'Fachada de prédio residencial ao entardecer',
    cenariosTitulo: 'Situações que todo síndico da região reconhece',
    cenariosLede:
      'Se alguma delas soa familiar, a conversa leva três minutos e você leva um comparativo para a assembleia.',
    cenarios: [
      { titulo: 'A renovação passou batida', texto: 'Entre uma assembleia e outra o vencimento chegou, e o prédio ficou dias sem cobertura vigente.' },
      { titulo: 'Cobertura mínima só no papel', texto: 'A apólice cumpre a exigência legal, mas deixa de fora elevador, portaria, danos elétricos e a responsabilidade civil do síndico.' },
      { titulo: 'Sinistro e ninguém atende', texto: 'O problema aconteceu no sábado e a corretora que vendeu a apólice fica a cem quilômetros dali.' },
      { titulo: 'A assembleia quer comparar', texto: 'Os condôminos pedem mais de uma proposta e você precisa de um comparativo claro para defender a escolha.' },
      { titulo: 'Segurado pelo valor de venda', texto: 'Reconstruir o prédio custa bem diferente de vendê-lo. Apólice subdimensionada só aparece no pior dia possível.' },
      { titulo: 'Prestador se machuca na área comum', texto: 'Jardineiro, piscineiro, empresa de elevador: sem responsabilidade civil, a conta pode bater na porta do condomínio.' },
      { titulo: 'Portaria e câmeras fora da apólice', texto: 'Equipamento eletrônico costuma exigir cobertura própria, separada do patrimonial — e é justamente o que mais dá problema.' },
      { titulo: 'Troca de síndico sem passar a apólice', texto: 'O síndico novo assume sem saber o que está coberto, com qual seguradora e até quando.' },
    ],
    coberturasTitulo: 'O que dá para proteger no condomínio',
    coberturas: [
      'Condominial obrigatório', 'Áreas comuns', 'Responsabilidade civil do síndico',
      'Equipamentos e elevadores', 'Danos elétricos', 'Vidros',
      'Vida em grupo dos funcionários', 'D&O para síndico profissional',
    ],
    meta: {
      title: 'Seguro condominial em Itapira | MX Seguros',
      description:
        'Seguro obrigatório de condomínio com corretora local. Comparativo para assembleia, aviso de vencimento e atendimento presencial em Itapira e região.',
    },
  },

  frota: {
    slug: 'frota',
    nav: 'Frota',
    urgencia: 'Risco que roda todo dia',
    eyebrow: 'Seguro de frota · Itapira e região',
    titulo: 'Seu veículo de entrega sai todo dia. A apólice acompanhou?',
    subtitulo:
      'Frota pequena costuma ficar de fora do planejamento de risco — até o primeiro sinistro parar a operação por semanas. O diagnóstico leva uma conversa.',
    cta: 'Diagnosticar minha frota',
    foto: '/hero/frota.jpg',
    fotoAlt: 'Pátio com veículos de frota empresarial',
    cenariosTitulo: 'Situações que param uma operação',
    cenariosLede:
      'Veículo parado é entrega atrasada, cliente perdido e faturamento que não volta.',
    cenarios: [
      { titulo: 'Apólice de pessoa física na frota', texto: 'Veículo usado para trabalho segurado como uso particular costuma dar problema justamente na hora do sinistro.' },
      { titulo: 'Cada carro numa seguradora', texto: 'Renovações em datas diferentes, franquias diferentes e nenhuma visão de custo total da frota.' },
      { titulo: 'Motorista sem cobertura', texto: 'O veículo tem seguro, mas quem dirige não tem proteção nem assistência prevista.' },
      { titulo: 'Sem carro reserva no contrato', texto: 'O utilitário bateu na segunda e a operação parou até quinta esperando conserto.' },
      { titulo: 'Franquia que inviabiliza o conserto', texto: 'Franquia alta parece economia na contratação, até o primeiro retrovisor quebrado sair mais barato do bolso.' },
      { titulo: 'Quem dirige não é quem foi declarado', texto: 'Perfil declarado diferente do motorista real é a causa clássica de recusa de sinistro.' },
      { titulo: 'A carga não é o veículo', texto: 'O seguro do caminhão não cobre o que está dentro dele. Mercadoria transportada tem apólice própria.' },
      { titulo: 'Cinco veículos, cinco vencimentos', texto: 'Renovações espalhadas pelo ano impedem negociar em escala e tiram qualquer controle do custo total.' },
    ],
    coberturasTitulo: 'O que dá para proteger na frota',
    coberturas: [
      'Casco e colisão', 'Responsabilidade civil facultativa', 'Carro reserva',
      'Assistência 24h', 'Vidros e faróis', 'Acidentes pessoais de passageiros',
      'Transporte de carga', 'Rastreamento',
    ],
    meta: {
      title: 'Seguro de frota em Itapira | MX Seguros',
      description:
        'Seguro de frota empresarial com corretora local. Renovações unificadas, carro reserva e assistência 24h para empresas de Itapira e região.',
    },
  },
};

export const SLUGS = Object.keys(SEGMENTOS) as Segmento[];

export function ehSegmento(v: string): v is Segmento {
  return v in SEGMENTOS;
}

export interface FotoHero {
  src: string;
  /** Descreve a cena — usado só nos rótulos dos controles; a foto em si é decorativa. */
  alt: string;
}

/**
 * As fotos que o hero rotaciona, começando sempre pela do próprio segmento.
 *
 * O protótipo tinha um slider único que trocava foto *e* copy junto. Aqui a
 * copy é fixa (ela pertence à rota), então só o fundo gira — a primeira foto
 * é a do segmento, e as demais entram como pano de fundo do mesmo discurso.
 *
 * Deriva de SEGMENTOS de propósito: segmento novo no objeto entra na rotação
 * de todos os outros sem tocar em nenhum componente.
 */
export function fundosHero(atual: Segmento): FotoHero[] {
  return [atual, ...SLUGS.filter((s) => s !== atual)].map((s) => ({
    src: SEGMENTOS[s].foto,
    alt: SEGMENTOS[s].fotoAlt,
  }));
}

/** Dados institucionais — usados no rodapé, no JSON-LD e no chat. */
export const MX_SITE = {
  nome: 'MX Corretora de Seguros',
  desde: 2002,
  telefone: '(19) 3863-8150',
  telefoneLink: '+551938638150',
  email: 'mxseguros@mxseguros.com.br',
  horario: 'segunda a sexta, das 8h às 18h',
  matriz: {
    rua: 'Avenida Rio Branco, 221',
    bairro: 'Centro',
    cidade: 'Itapira',
    uf: 'SP',
    cep: '13970-070',
  },
  filial: {
    rua: 'Rua Argentina, 15 — salas 2 e 3',
    bairro: 'Centro',
    cidade: 'Águas de Lindoia',
    uf: 'SP',
  },
  /** PENDENTE — obrigatórios no rodapé, ainda não fornecidos pela MX. */
  cnpj: null as string | null,
  susep: null as string | null,
} as const;

export const SEGURADORAS = [
  { slug: 'allianz', nome: 'Allianz' },
  { slug: 'azul', nome: 'Azul Seguros' },
  { slug: 'hdi', nome: 'HDI Seguros' },
  { slug: 'itau', nome: 'Itaú Seguros' },
  { slug: 'msig', nome: 'Mitsui Sumitomo Seguros' },
  { slug: 'sompo', nome: 'Sompo Seguros' },
  { slug: 'tokio', nome: 'Tokio Marine Seguradora' },
  { slug: 'yelum', nome: 'Yelum Seguradora' },
  { slug: 'zurich', nome: 'Zurich Seguros' },
] as const;
