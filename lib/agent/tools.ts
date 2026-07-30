import { tool } from 'ai';
import { z } from 'zod';
import { leadSchema, temOEssencial, type Lead, type Origem } from './schema';
import { pontuar } from './score';
import { deliverLead } from '../leads/sink';
import { MX } from './config';

/**
 * Ferramentas do agente MX Empresas.
 *
 * O agente coleta; estas ferramentas persistem e roteiam. A decisão de score
 * acontece em pontuar(), fora do modelo.
 */

export function criarTools(ctx: { conversaId: string; origem: Origem }) {
  /** Acumula o que o agente descobriu ao longo da conversa. */
  let acumulado: Lead = {};

  return {
    salvarQualificacao: tool({
      description:
        'Registra o que você já descobriu sobre o cliente. Pode ser chamada várias vezes conforme ' +
        'a conversa avança — mande só os campos novos. Quando houver o essencial (o que proteger, ' +
        'situação atual e contato), o lead é encaminhado automaticamente ao corretor.',
      inputSchema: leadSchema,
      execute: async (parcial) => {
        acumulado = { ...acumulado, ...parcial };

        const pronto = temOEssencial(acumulado);
        if (!pronto) {
          return {
            registrado: true,
            encaminhado: false,
            faltando: faltantes(acumulado),
          };
        }

        const resultado = pontuar(acumulado);
        await deliverLead({
          lead: acumulado,
          resultado,
          origem: ctx.origem,
          conversaId: ctx.conversaId,
        });

        return {
          registrado: true,
          encaminhado: true,
          protocolo: ctx.conversaId,
          prazoRetorno: MX.prazoRetorno,
        };
      },
    }),

    solicitarContatoHumano: tool({
      description:
        'Chame imediatamente quando a pessoa pedir para falar com um humano, demonstrar ' +
        'desconforto com o atendimento automático, ou trouxer assunto que exige corretor habilitado.',
      inputSchema: z.object({
        motivo: z.string().describe('Por que está encaminhando — ajuda o corretor a se preparar'),
      }),
      execute: async ({ motivo }) => {
        const resultado = pontuar(acumulado);
        await deliverLead({
          lead: acumulado,
          resultado,
          origem: ctx.origem,
          conversaId: ctx.conversaId,
          escapeHumano: motivo,
        });
        return {
          telefone: MX.telefone,
          horario: MX.horarioAtendimento,
          protocolo: ctx.conversaId,
        };
      },
    }),

    encerrarConversa: tool({
      description:
        'Chame quando a conversa terminar naturalmente, mesmo sem qualificação completa. ' +
        'Salva o que foi coletado para que nada se perca.',
      inputSchema: z.object({
        motivo: z.enum(['qualificado', 'desistiu', 'fora_de_escopo']),
      }),
      execute: async ({ motivo }) => {
        if (motivo !== 'qualificado' && Object.keys(acumulado).length > 0) {
          await deliverLead({
            lead: acumulado,
            resultado: pontuar(acumulado),
            origem: ctx.origem,
            conversaId: ctx.conversaId,
            parcial: true,
          });
        }
        return { encerrado: true };
      },
    }),
  };
}

function faltantes(lead: Lead): string[] {
  const f: string[] = [];
  if (!lead.ramos?.length && !lead.atividade && !lead.segmento) f.push('o que a pessoa quer proteger');
  if (lead.temSeguroHoje === undefined && lead.vencimento === undefined) f.push('situação do seguro atual');
  if (!lead.whatsapp && !lead.email) f.push('contato');
  return f;
}
