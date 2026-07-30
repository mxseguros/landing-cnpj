import { z } from 'zod';
import { origemSchema, segmentoEnum, type Lead } from '@/lib/agent/schema';
import { pontuar } from '@/lib/agent/score';
import { deliverLead } from '@/lib/leads/sink';

/**
 * Formulário de fallback.
 *
 * Existe porque parte do público não quer conversar com IA — e porque, se o
 * agente cair, esta rota continua capturando lead. Depender só do chat é
 * transformar uma indisponibilidade do modelo em zero lead no dia.
 */

const corpo = z.object({
  nome: z.string().min(2).max(120),
  empresa: z.string().min(2).max(160),
  whatsapp: z.string().min(8).max(24),
  email: z.string().email().max(160).optional().or(z.literal('')),
  vencimento: z.enum(['ate_30_dias', 'ate_90_dias', 'mais_de_90_dias', 'nao_tem_seguro']),
  segmento: segmentoEnum,
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

  // Sem isto o lead não tem ramo nenhum e o motor de score o classifica como
  // "sem ramo que justifique prioridade" — o segmento da página já diz qual é.
  const RAMO_DO_SEGMENTO = {
    empresas: 'patrimonial',
    condominio: 'condominial',
    frota: 'frota',
  } as const;

  const lead: Lead = {
    nome: d.nome,
    empresa: d.empresa,
    whatsapp: d.whatsapp,
    email: d.email || undefined,
    segmento: d.segmento,
    ramos: [RAMO_DO_SEGMENTO[d.segmento]],
    vencimento: d.vencimento,
    temSeguroHoje: d.vencimento !== 'nao_tem_seguro',
    consentimentoLgpd: true,
    observacoes: 'Veio pelo formulário, não pelo chat — não passou por qualificação.',
  };

  try {
    await deliverLead({
      lead,
      resultado: pontuar(lead),
      origem: origemSchema.parse({ ...(d.origem ?? {}), paginaSegmento: d.segmento }),
      conversaId,
      parcial: true,
      viaFormulario: true,
    });
  } catch (erro) {
    console.error('[lead]', conversaId, erro);
    return Response.json({ erro: 'falha ao registrar' }, { status: 500 });
  }

  return Response.json({ ok: true, protocolo: conversaId });
}
