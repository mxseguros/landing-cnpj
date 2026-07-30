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
  // Falha cedo e explícita: sem isso o erro só aparece lá dentro do agente,
  // como um 401 genérico que não diz que a variável simplesmente não existe.
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('[chat] ANTHROPIC_API_KEY ausente — configure em `vercel env add`');
    return Response.json({ erro: 'agente indisponível' }, { status: 503 });
  }

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

  // O protocolo nasce no cliente e acompanha a conversa inteira. Se fosse
  // gerado aqui, cada mensagem do visitante viraria um protocolo diferente —
  // e `deliverLead` criaria um lead novo por turno em vez de um por conversa.
  const conversaId =
    typeof body.conversaId === 'string' && /^MX-[A-Z0-9]{6}$/.test(body.conversaId)
      ? body.conversaId
      : null;
  if (!conversaId) {
    return Response.json({ erro: 'conversaId ausente ou inválido' }, { status: 400 });
  }

  const agente = criarAgente(parseSegmento.data, { conversaId, origem });

  return createAgentUIStreamResponse({
    agent: agente,
    uiMessages: messages,
    onError: (erro) => {
      // O texto que chega ao visitante é genérico de propósito; o erro real
      // precisa ficar no log, senão não há como diagnosticar em produção.
      console.error('[chat]', conversaId, parseSegmento.data, erro);
      return 'Não consegui responder agora.';
    },
  });
}
