import { ToolLoopAgent, isStepCount } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { systemPrompt } from './prompt';
import { criarTools } from './tools';
import type { Origem, Segmento } from './schema';

/**
 * Agente MX Empresas.
 *
 * Acesso direto à API da Anthropic via `ANTHROPIC_API_KEY`, seguindo o mesmo
 * padrão do sistema de DRE (`DRE_APP_FINAL/app/ai/orchestrator.py`): uma chave
 * só, um console só, uma fatura só para os dois projetos.
 *
 * Custo medido: ~US$ 0,06 por conversa de qualificação (~R$ 0,33), contra o teto
 * de R$ 2,00 por lead do PRD. Custo não é a restrição aqui — uma única apólice
 * empresarial paga o ano inteiro de LLM. Por isso o modelo mais capaz.
 */
export const MODELO = 'claude-opus-5';

export function criarAgente(segmento: Segmento, ctx: { conversaId: string; origem: Origem }) {
  return new ToolLoopAgent({
    model: anthropic(MODELO),
    instructions: systemPrompt(segmento),
    tools: criarTools(ctx),

    /**
     * Thinking ligado, mas raso.
     *
     * No Opus 5 o thinking vem ligado por padrão, o que custaria latência num
     * chat que precisa de primeiro token em menos de 2s (PRD §6). A tentação é
     * desligar — mas com thinking desligado o modelo ocasionalmente escreve a
     * chamada de ferramenta como texto na resposta em vez de emitir um tool call
     * de verdade. O turno termina normal, sem erro, e `salvarQualificacao` nunca
     * roda: o lead se perde em silêncio. Num agente cuja função é justamente
     * gravar o lead, esse é o pior modo de falha possível.
     *
     * 'low' resolve os dois lados — segura a latência e mantém o tool calling
     * confiável.
     */
    reasoning: 'low',

    // Teto de segurança: conversa de qualificação não precisa de loop longo,
    // e passo demais vira custo sem retorno.
    stopWhen: isStepCount(8),
  });
}
