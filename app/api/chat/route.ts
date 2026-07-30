import { createAgentUIStreamResponse, type UIMessage } from 'ai';
import { criarAgente } from '@/lib/agent';
import { origemSchema, segmentoEnum } from '@/lib/agent/schema';

/**
 * Endpoint do agente MX Empresas.
 *
 * Runtime Node.js (Fluid Compute) — streaming funciona sem `runtime = 'edge'`,
 * e mantemos as APIs completas do Node para o banco e o envio de e-mail.
 */

export const maxDuration = 60;

export async function POST(req: Request) {
  const body = await req.json();

  const parseSegmento = segmentoEnum.safeParse(body.segmento);
  if (!parseSegmento.success) {
    return Response.json({ erro: 'segmento inválido' }, { status: 400 });
  }

  const messages = body.messages as UIMessage[];
  if (!Array.isArray(messages) || messages.length === 0) {
    return Response.json({ erro: 'sem mensagens' }, { status: 400 });
  }

  // Teto de turnos: protege custo e evita conversa infinita (PRD §RNF segurança).
  if (messages.length > 30) {
    return Response.json({ erro: 'conversa longa demais' }, { status: 429 });
  }

  // TODO Fase 3 — BotID e rate limit por IP/sessão antes de chegar no modelo.

  const origem = origemSchema.parse({
    ...(body.origem ?? {}),
    paginaSegmento: parseSegmento.data,
  });

  const conversaId = typeof body.conversaId === 'string' ? body.conversaId : novoProtocolo();

  const agente = criarAgente(parseSegmento.data, { conversaId, origem });

  return createAgentUIStreamResponse({
    agent: agente,
    uiMessages: messages,
  });
}

function novoProtocolo(): string {
  return 'MX-' + Math.random().toString(36).slice(2, 8).toUpperCase();
}
