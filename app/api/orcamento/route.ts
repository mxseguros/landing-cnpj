import { z } from 'zod';
import { origemSchema, janelaPlantioEnum, papelEnum, type Lead } from '@/lib/agent/schema';
import { RAMO_LABEL_AGRO } from '@/lib/agent/config';
import { pontuar } from '@/lib/agent/score';
import { deliverLead } from '@/lib/leads/sink';

/**
 * Solicitação de orçamento do agro.
 *
 * Terceira porta de entrada de lead, ao lado do chat e do formulário de
 * fallback, e a única que chega ao corretor com área conferida: quando o
 * produtor informa o CAR, município e hectares vêm do registro, não da memória
 * dele. Área é a variável que mais pesa na cotação rural e é justamente a que
 * mais volta errada de formulário — o produtor responde a área da matrícula, a
 * área plantada ou um arredondamento.
 *
 * A consulta ao CAR é opcional de propósito. Nem todo produtor sabe o código de
 * cor, e alguns nem têm o cadastro em dia; exigir isso trocaria um orçamento
 * melhor por nenhum orçamento.
 */

const RAMOS_AGRO = Object.keys(RAMO_LABEL_AGRO) as [string, ...string[]];

const corpo = z.object({
  nome: z.string().min(2).max(120),
  propriedade: z.string().min(2).max(160),
  whatsapp: z.string().min(8).max(24),
  email: z.string().email().max(160).optional().or(z.literal('')),

  // Vem da consulta ao CAR quando ela aconteceu; digitado pelo produtor quando não.
  car: z.string().max(60).optional(),
  cidade: z.string().max(120).optional(),
  hectares: z.number().nonnegative().max(1_000_000).optional(),
  /** Marca se a área foi conferida no registro ou estimada pelo produtor. */
  areaVerificada: z.boolean().default(false),

  cultura: z.string().max(120).optional(),
  janelaPlantio: janelaPlantioEnum.optional(),
  temCreditoRural: z.boolean().default(false),
  papel: papelEnum.optional(),
  ramos: z.array(z.enum(RAMOS_AGRO)).min(1).max(RAMOS_AGRO.length),

  consentimentoLgpd: z.literal(true),
  origem: origemSchema.partial().optional(),
  // Campo invisível: humano nunca preenche, bot preenche quase sempre.
  website: z.string().max(0).optional(),
});

export async function POST(req: Request) {
  const parse = corpo.safeParse(await req.json().catch(() => null));
  if (!parse.success) {
    return Response.json(
      { erro: 'dados inválidos', detalhes: parse.error.flatten().fieldErrors },
      { status: 400 },
    );
  }
  const d = parse.data;

  const conversaId = 'MX-' + Math.random().toString(36).slice(2, 8).toUpperCase();

  const lead: Lead = {
    nome: d.nome,
    empresa: d.propriedade,
    segmento: 'agro',
    cidade: d.cidade || undefined,
    ramos: d.ramos,
    hectares: d.hectares,
    cultura: d.cultura || undefined,
    janelaPlantio: d.janelaPlantio,
    temCreditoRural: d.temCreditoRural,
    papel: d.papel,
    // O crédito rural em aberto é o gatilho mais comum do seguro rural: o banco
    // exige apólice para liberar o custeio, e quem chega assim tem prazo real.
    gatilho: d.temCreditoRural ? 'exigencia_banco_contrato' : 'pesquisa_inicial',
    consentimentoLgpd: true,
    observacoes: observacoes(d),
  };

  try {
    await deliverLead({
      lead,
      resultado: pontuar(lead),
      origem: origemSchema.parse({ ...(d.origem ?? {}), paginaSegmento: 'agro' }),
      conversaId,
      // Mesma razão do formulário de fallback: quem pede orçamento está pedindo
      // contato explicitamente, então a notificação não passa pelo filtro de score.
      viaFormulario: true,
    });
  } catch (erro) {
    console.error('[orcamento]', conversaId, erro);
    return Response.json({ erro: 'falha ao registrar' }, { status: 500 });
  }

  return Response.json({ ok: true, protocolo: conversaId });
}

/**
 * O corretor precisa saber de onde veio a área antes de usá-la na cotação:
 * número do registro ele leva para a seguradora, número estimado ele confere.
 */
function observacoes(d: z.infer<typeof corpo>): string {
  const linhas = ['Veio pela solicitação de orçamento do agro — não passou pelo chat.'];

  if (d.car) {
    linhas.push(
      d.areaVerificada
        ? `CAR ${d.car} consultado no registro: ${d.hectares} ha em ${d.cidade}.`
        : `CAR informado pelo produtor (${d.car}), não conferido no registro.`,
    );
  } else if (d.hectares) {
    linhas.push(`Área informada pelo produtor (${d.hectares} ha), sem CAR.`);
  }

  return linhas.join(' ');
}
