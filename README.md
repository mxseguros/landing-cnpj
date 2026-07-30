# MX Seguros — Landing Pages B2B + Agente de IA

Captação e qualificação automatizada de leads PJ para a **MX Seguros** (Itapira/SP).

A célula B2B da corretora tem duas pessoas — um *hunter* e um *closer* — para 120–160 contatos prospectados por mês. O hunter é o gargalo, e a etapa de qualificação do funil ("perfil, vencimento do seguro atual, quem decide") é roteirizável. Este projeto automatiza essa etapa: o visitante conversa com um agente de IA na landing page, o sistema pontua e roteia, e o closer recebe o lead pronto.

> ⚠️ **Repositório privado.** Contém a estratégia comercial da MX — metas, ICP, contas-alvo nomeadas e canais de prospecção. Não tornar público.

## Documentação

| Documento | Conteúdo |
|---|---|
| [docs/Plano.md](docs/Plano.md) | Plano de execução: escopo, arquitetura, 8 fases com checklist, riscos, pendências |
| [docs/PRD.md](docs/PRD.md) | Requisitos: personas, métricas, requisitos funcionais, guardrails, modelo de dados, evals |
| [docs/Agente_Corretor_PJ_MX.md](docs/Agente_Corretor_PJ_MX.md) | Persona do agente — **fonte de verdade**; o código é a implementação |
| `docs/planejamento.docx` | Plano comercial B2B da MX (documento do cliente) |
| `docs/MXSeguros_Estrategia_Marketing_B2B.pptx` | Estratégia de marketing B2B (documento do cliente) |

## Estado atual

**Fase 2** — app no ar localmente. Next.js 16 + React 19 + Tailwind v4, três landing pages geradas estaticamente e o agente ligado ao chat.

```bash
npm install
cp .env.example .env.local   # preencha ANTHROPIC_API_KEY
npm run dev                  # http://localhost:3000 → /empresas
```

| Rota | O que é |
|---|---|
| `/` | Redireciona para `/empresas` |
| `/empresas` · `/condominio` · `/frota` | Landing pages (SSG, revalidação diária) |
| `/api/chat` | Endpoint do agente, streaming, runtime Node.js |

```
lib/segments/config.ts      copy, cenários, coberturas e metadata por segmento
lib/agent/prompt.ts         system prompt e guardrails (traduz o doc da persona)
lib/agent/schema.ts         schema Zod do lead
lib/agent/score.ts          motor A/B/C + flag conta_tecnica — determinístico
lib/agent/tools.ts          salvarQualificacao · solicitarContatoHumano · encerrarConversa
lib/agent/evals.ts          10 casos de score + 12 de conversa
lib/leads/sink.ts           deliverLead() — ponto único de saída do lead
app/[segmento]/page.tsx     template único; não conhece nenhum segmento pelo nome
components/chat/            widget de qualificação (único componente client)
prototipo/index.html        protótipo estático original, mantido como referência
```

**Duas decisões que vale conhecer antes de mexer:**

A pontuação do lead roda em `score.ts`, não no modelo. A IA coleta; a regra decide. Um LLM atribuindo score é inauditável e muda de resposta entre execuções, o que impede calibrar o roteamento com o feedback do closer.

Adicionar um segmento é acrescentar uma entrada em `lib/segments/config.ts` e a chave correspondente em `segmentoEnum` e `FOCO_POR_SEGMENTO`. Nenhum componente muda.

## Configuração

```bash
cp .env.example .env.local   # preencha ANTHROPIC_API_KEY
```

A chave sai de `platform.claude.com` → Settings → API Keys. Use uma dedicada a este projeto, não a mesma do sistema de DRE — assim dá para revogar uma sem derrubar a outra. **Nunca comite `.env.local`.**

Modelo: `claude-opus-5` via `@ai-sdk/anthropic`, com `reasoning: 'low'`. O motivo do `low` está comentado em [lib/agent/index.ts](lib/agent/index.ts) e não é sobre custo — é que com thinking desligado o modelo às vezes escreve a chamada de ferramenta como texto, e o lead nunca é gravado.

## Pendências do cliente

**Bloqueiam o go-live:** CNPJ e registro SUSEP da corretora · direito de uso dos logos das seguradoras.
**Bloqueiam a Fase 4:** SLA de resposta ao lead A · número de WhatsApp da célula · qual CRM ativar.
**Bloqueia o deploy:** acesso ao DNS de `mxseguros.com.br`.

Lista completa em [docs/Plano.md](docs/Plano.md) §10.
