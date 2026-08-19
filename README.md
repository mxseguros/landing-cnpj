# MX Seguros — Landing Pages B2B + Agente de IA

Captação e qualificação automatizada de leads PJ para a **MX Seguros** (Itapira/SP).

A célula B2B da corretora tem duas pessoas — um *hunter* e um *closer* — para 120–160 contatos prospectados por mês. O hunter é o gargalo, e a etapa de qualificação do funil ("perfil, vencimento do seguro atual, quem decide") é roteirizável. Este projeto automatiza essa etapa: o visitante conversa com um agente de IA na landing page, o sistema pontua e roteia, e o closer recebe o lead pronto.

> ⚠️ **Repositório privado.** Contém a estratégia comercial da MX — metas, ICP, contas-alvo nomeadas e canais de prospecção. Não tornar público.

## Documentação

| Documento | Conteúdo |
|---|---|
| [docs/Plano.md](docs/Plano.md) | Plano de execução: escopo, arquitetura, 8 fases com checklist, riscos, pendências |
| [docs/PRD.md](docs/PRD.md) | Requisitos: personas, métricas, requisitos funcionais, guardrails, modelo de dados, evals |
| [docs/Agente_Corretor_PJ_MX.md](docs/Agente_Corretor_PJ_MX.md) | Persona do agente PJ — **fonte de verdade**; o código é a implementação |
| [docs/Agente_MX_Agro.md](docs/Agente_MX_Agro.md) | Persona do agente rural — **fonte de verdade**; explica por que não é o agente PJ |
| `docs/planejamento.docx` | Plano comercial B2B da MX (documento do cliente) |
| `docs/MXSeguros_Estrategia_Marketing_B2B.pptx` | Estratégia de marketing B2B (documento do cliente) |

## Estado atual

**No ar em staging:** https://landing-cnpj.vercel.app → redireciona para `/empresas`

Next.js 16 + React 19 + Tailwind v4, três landing pages geradas estaticamente e o agente ligado ao chat. As Fases 1, 2 e 3 estão essencialmente concluídas; a Fase 4 (Postgres, e-mail, LGPD) ainda não começou — `deliverLead()` hoje só escreve no log.

> **Staging, não produção.** Enquanto o host não for `mxseguros.com.br`, `robots.ts` bloqueia a indexação por completo (`Disallow: /`) — uma página em `*.vercel.app` indexada competiria com o site institucional exatamente nas buscas que este projeto existe para ganhar. O critério está em [lib/site.ts](lib/site.ts); nada precisa ser alterado no deploy final além do DNS.

```bash
npm install
cp .env.example .env.local   # preencha ANTHROPIC_API_KEY
npm run dev                  # http://localhost:3000 → /empresas
```

| Rota | O que é |
|---|---|
| `/` | Redireciona para `/empresas` |
| `/empresas` · `/condominio` · `/frota` · `/agro` | Landing pages (SSG, revalidação diária) |
| `/api/chat` | Endpoint do agente, streaming, runtime Node.js |
| `/api/lead` | Formulário de fallback — mesmo `deliverLead()` do chat |
| `/sitemap.xml` · `/robots.txt` | Gerados de `lib/site.ts` conforme o host |

```
lib/segments/config.ts      copy, cenários, coberturas e metadata por segmento
lib/site.ts                 host do deploy; decide indexação e URL canônica
lib/agent/prompt.ts         personas por público + guardrails (traduz os docs de persona)
lib/agent/schema.ts         schema Zod do lead
lib/agent/score.ts          motor A/B/C + flag conta_tecnica — determinístico
lib/agent/tools.ts          salvarQualificacao · solicitarContatoHumano · encerrarConversa
lib/agent/evals.ts          16 casos de score + 19 de conversa
lib/leads/sink.ts           deliverLead() — ponto único de saída do lead
app/[segmento]/page.tsx     template único; não conhece nenhum segmento pelo nome
components/chat/            widget de qualificação e formulário de fallback
components/hero-fundo.tsx   rotação automática do fundo do hero
components/alternador-tema.tsx  claro/escuro
prototipo/index.html        protótipo estático original, mantido como referência
```

O protótipo é **registro do que foi aprovado**, não espelho da produção: ele ainda tem o slider que trocava copy e foto juntas, que virou três rotas com fundo rotativo. Consultar como histórico, não sincronizar.

**Duas decisões que vale conhecer antes de mexer:**

A pontuação do lead roda em `score.ts`, não no modelo. A IA coleta; a regra decide. Um LLM atribuindo score é inauditável e muda de resposta entre execuções, o que impede calibrar o roteamento com o feedback do closer.

Adicionar um segmento é acrescentar uma entrada em `lib/segments/config.ts` e a chave correspondente em `segmentoEnum` (`lib/agent/schema.ts`), `PERSONAS` (`lib/agent/prompt.ts`) e `PUBLICO_POR_SEGMENTO` (`lib/agent/config.ts`). Nenhum componente muda.

Isso vale enquanto o público for o mesmo. `/agro` foi o primeiro segmento a falar com **produtor rural, PF ou PJ**, e três premissas do código B2B tiveram que virar configuração: o agente PJ recusava pessoa física, o score derrubava lead sem CNPJ, e a urgência era o vencimento da apólice — no agro é a janela de plantio. Quem entra por `PUBLICO_POR_SEGMENTO` herda esse tratamento; é por ali que `/cpf` deve entrar.

## Configuração

```bash
cp .env.example .env.local   # preencha ANTHROPIC_API_KEY
```

A chave sai de `platform.claude.com` → Settings → API Keys. Use uma dedicada a este projeto, não a mesma do sistema de DRE — assim dá para revogar uma sem derrubar a outra. **Nunca comite `.env.local`.**

Modelo: `claude-opus-5` via `@ai-sdk/anthropic`, com `reasoning: 'low'`. O motivo do `low` está comentado em [lib/agent/index.ts](lib/agent/index.ts) e não é sobre custo — é que com thinking desligado o modelo às vezes escreve a chamada de ferramenta como texto, e o lead nunca é gravado.

Na Vercel a mesma chave vive em Settings → Environment Variables, marcada em Production. Duas armadilhas já custaram um diagnóstico cada:

- **variável nova ou trocada só vale a partir do próximo deploy.** O deployment no ar carrega o valor que existia quando foi construído; trocar no painel não alcança ele. Depois de mexer, Deployments → `···` → Redeploy.
- **os dois modos de falha são silenciosos e diferentes.** Sem a variável, `/api/chat` responde `503 {"erro":"agente indisponível"}` — o guard em [app/api/chat/route.ts](app/api/chat/route.ts) falha cedo de propósito. Com a variável presente mas a chave inválida, vem `200` e um stream que começa e morre em `{"type":"error"}`, e o visitante vê a mensagem de "tive um problema para responder agora". Nos dois casos o erro cru está no Runtime Log, na linha `[chat]`.

## Pendências do cliente

**Bloqueiam o go-live:** CNPJ e registro SUSEP da corretora · direito de uso dos logos das seguradoras · Política de Privacidade (exigida pelo Google Ads, ainda não escrita).
**Bloqueiam a Fase 4:** SLA de resposta ao lead A · número de WhatsApp da célula · qual CRM ativar.
**Bloqueia a indexação:** acesso ao DNS de `mxseguros.com.br`. O deploy já existe e funciona; enquanto o host for `*.vercel.app` ele permanece `noindex` por decisão de projeto, não por falha.

Lista completa em [docs/Plano.md](docs/Plano.md) §10.
