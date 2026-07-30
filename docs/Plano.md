# Plano de Execução — Landing Pages B2B + Agente de IA de Qualificação

**Cliente:** MX Seguros · Itapira/SP
**Documento:** plano de execução · julho de 2026
**Fontes:** `planejamento.docx` (Plano Comercial B2B) e `MXSeguros_Estrategia_Marketing_B2B.pptx`
**Documento irmão:** [PRD.md](PRD.md) — requisitos detalhados de produto

---

## 1. Por que este projeto existe

A MX Seguros está estruturando a venda para CNPJ com uma **célula B2B de 2 pessoas**: um *hunter* (prospecção e qualificação) e um *closer* (diagnóstico, cotação, fechamento). As metas da célula são 120–160 contatos prospectados, 20–30 reuniões e 6–10 apólices por mês.

Com duas pessoas, o hunter é o gargalo do funil. A etapa "Qualificação" está definida no plano comercial como *"perfil, vencimento do seguro atual, quem decide"* — trabalho repetitivo, roteirizável e que hoje consome o tempo que deveria ir para parcerias com contadores e administradoras, o canal de maior ROI do plano.

O plano de marketing já pede o ativo (slide 8): *"Site & landing pages — páginas por segmento (Empresas, Condomínio, Frota) com formulário que cai no WhatsApp da célula"*.

Este projeto entrega essas páginas **com um agente de IA no lugar do formulário burro**: o visitante conversa, o agente coleta os campos de qualificação, o sistema pontua e roteia. O closer recebe lead pronto; o hunter volta a prospectar.

**Regra que atravessa tudo**, citada nos dois documentos: *"o que não está no CRM não existe"* e *"sem o CRM ligando as pontas, verba de marketing vira lead perdido"*.

---

## 2. Escopo

### Ship 1 (este plano)
- Template de página dirigido por configuração de segmento
- **`/empresas`** — comércio e serviços; casa com o Google Ads de "seguro empresarial Itapira"
- **`/condominio`** — obrigatório por lei, recorrente, síndico decide direto
- Agente de IA de qualificação nas duas páginas, com perguntas específicas por segmento
- Persistência, pontuação e roteamento do lead
- Analytics de funil

### Ship 2 (fora deste plano)
`/frota`; notificação via WhatsApp Cloud API; integração com o CRM definitivo; remarketing; avaliar `/agronegocio` e `/industria`.

### Explicitamente fora de escopo
Reformulação do site institucional; automação de e-mail marketing; portal do cliente; cotação automatizada de preço (proibido — ver PRD §7).

---

## 3. Decisões de arquitetura

| Camada | Escolha | Motivo |
|---|---|---|
| Framework | Next.js 16 App Router + TypeScript | Rota dinâmica por segmento; Server Components para LCP baixo |
| UI | Tailwind CSS v4 + shadcn/ui | Velocidade; acessível por padrão |
| Host | Vercel, runtime Node.js (Fluid Compute) | Streaming do chat sem `runtime = 'edge'` |
| LLM | AI SDK v7 + `@ai-sdk/anthropic`, modelo `claude-opus-5` | API da Anthropic direto, mesmo padrão do sistema de DRE — uma chave para os dois projetos. Custo medido em ~R$ 0,33/conversa, seis vezes abaixo do teto |
| Banco | Neon Postgres (Vercel Marketplace) | Leads, transcript, score, UTM |
| Notificação | Botão `wa.me` + e-mail (Resend) | A célula não tem Meta Cloud API — ver §4 |
| Anti-abuso | Vercel BotID + rate limit por IP/sessão | Endpoint de LLM exposto é alvo de bot e de custo |
| Analytics | Vercel Analytics + eventos de funil | Sem tag manager pesado no MVP |

Integrações externas provisionadas via `vercel integration`, nunca com SDK hardcoded.

### O que é preciso contratar para o agente rodar

1. **Conta no Console da Anthropic** (`platform.claude.com`) com billing de API ativo — a mesma já usada pelo sistema de DRE
2. **`ANTHROPIC_API_KEY`** em `.env.local`, fora do git. Em produção, cadastrada via `vercel env`
3. **Limite de gasto configurado no Console** — proteção contra bot antes do BotID entrar na Fase 3

> **Decisão:** API da Anthropic direto, não o Vercel AI Gateway. O motivo é consistência operacional — o sistema de DRE (`DRE_APP_FINAL/app/ai/orchestrator.py`) já usa `ANTHROPIC_API_KEY` com o SDK oficial. Uma chave, um console, uma fatura, um lugar para ver consumo dos dois projetos. O gateway daria troca de modelo por string e fallback automático; abrimos mão disso em favor de não ter dois provedores de IA na operação.

> ⚠️ **Assinatura do Claude não é API.** Claude Pro, Max, Team e Enterprise pagam o claude.ai e o Claude Code — uso interativo, por pessoa. Não geram token de API para uma aplicação, e não há como apontar o agente para elas: os limites são dimensionados para uma pessoa conversando, não para um site atendendo visitantes. O billing de API é habilitado à parte, no Console.

### Saída do lead
Postgres é a fonte de verdade. Toda saída passa por **um único módulo** `lib/leads/sink.ts` → `deliverLead()`, que no Ship 1 dispara: gravação no banco, e-mail ao corretor e — no fim da conversa — um botão `wa.me` **com mensagem pré-preenchida contendo o protocolo da qualificação**.

Trocar para RD Station, Pipedrive ou outro CRM depois é trocar uma implementação, não refatorar o app.

> **Decisão registrada:** não acoplar ao PipeFlow CRM (projeto `CRM_MX`) neste momento. São dois projetos imaturos, e a dependência atrasaria ambos.

---

## 4. Por que `wa.me` em vez da Cloud API no Ship 1

A célula usa um número WhatsApp comum, sem conta na Meta Cloud API. Provisionar a API oficial exige verificação de negócio e aprovação de template — de uma a duas semanas de burocracia fora do nosso controle.

O botão `wa.me` com mensagem pré-preenchida cumpre o *"cai no WhatsApp da célula"* com custo zero e sem dependência externa. A Cloud API entra no Ship 2 trocando a implementação dentro de `deliverLead()`.

**Isso tira o lançamento do caminho crítico da Meta.**

---

## 5. Identidade visual

Não existe manual de marca. A identidade foi derivada de `mxseguros.com.br` para não destoar do institucional.

| Token | Hex | Uso |
|---|---|---|
| `navy` | `#071B34` | Cor institucional dominante |
| `sage` | `#B0AF94` | Acento — é a cor do símbolo M/X do logo |
| `sage-light` | `#D0D5D2` | Superfícies e divisores |
| `whatsapp` | `#25D366` | Exclusivo do CTA de WhatsApp |

Navy + sage é uma combinação incomum e boa para seguros B2B: séria sem cair no azul corporativo genérico. **Manter, não substituir.**

O site carrega Lato, Roboto, Roboto Slab e Ubuntu simultaneamente — kitchen sink de tema WordPress, não escolha de marca. As páginas definem um par tipográfico próprio e enxuto.

### Prova social disponível
- **"No mercado de seguros desde 2002"** — 20+ anos
- **10 seguradoras parceiras:** Azul, Itaú, MSIG, Tokio Marine, HDI, Yelum, Allianz, Zurich, Sompo, Bradesco — sustenta a promessa de multicálculo
- **25+ logos de clientes** (varejo, restaurantes, óticas, farmácias) — exatamente o ICP de comércio e serviços
- **Duas unidades:** Av. Rio Branco, 221 — Centro, Itapira/SP · Rua Argentina, 15 — Águas de Lindoia
- Sem depoimentos ainda; o plano de marketing prevê pedir avaliação no Google a cada cliente

---

## 6. Fases e checklist

### Fase 0 — Fundação
- [x] Ler os documentos comercial e de marketing
- [x] Extrair ICP, segmentos, ramos por fase, raio geográfico, gatilhos e KPIs
- [x] Extrair identidade visual e prova social do site atual
- [x] Escrever este plano e o PRD
- [ ] Aprovar o protótipo de UI
- [ ] Fechar a tabela de score A/B/C junto do closer, em linguagem de negócio
- [ ] Confirmar acesso ao DNS e como publicar sob `mxseguros.com.br`
- [ ] Inicializar: `create-next-app`, git, projeto Vercel, ambiente de preview

### Fase 1 — Mensagem por segmento
- [ ] Headline e oferta de `/empresas` — dor do comerciante e prestador local
- [ ] Headline e oferta de `/condominio` — obrigatoriedade legal e responsabilidade do síndico
- [ ] CTA consultivo, ecoando o material de vendas do plano de marketing ("raio-x de riscos")
- [ ] Mapear objeções do decisor PJ e onde cada uma é respondida
- [ ] Copy completo dos dois segmentos
- [ ] Revisão regulatória: nada de prometer cobertura ou preço

### Fase 2 — Build das páginas
- [ ] Design tokens navy/sage em Tailwind v4
- [ ] shadcn/ui e componentes base
- [ ] Rota `app/[segmento]/page.tsx` dirigida por `lib/segments/config.ts` — copy, coberturas, perguntas e regras vêm da config, não do JSX
- [ ] Seções como Server Components; só o chat é client
- [ ] Mobile-first — tráfego de Google Ads local é majoritariamente mobile
- [ ] WCAG 2.2 AA: contraste, foco visível, labels, navegação por teclado
- [ ] Performance: `next/image`, `next/font`, LCP < 2,5 s, CLS < 0,1
- [ ] Formulário de fallback para quem não quer conversar
- [ ] SEO local: metadata por segmento, JSON-LD `InsuranceAgency` com o endereço de Itapira, `sitemap.ts`, `robots.ts`
- [ ] Política de Privacidade e Termos — obrigatório para rodar Google Ads
- [ ] Deploy de preview e revisão em dispositivo real

> **Marco:** aqui as páginas já recebem tráfego pago com formulário. O agente é incremento, não pré-requisito.

### Fase 3 — Agente de IA
- [ ] Schema Zod do lead (PRD §5)
- [ ] System prompt: consultor de riscos da MX, tom local e direto, **uma pergunta por vez, máximo 6–8 turnos**
- [ ] Guardrails (PRD §7)
- [ ] Tools: `salvarQualificacao`, `solicitarContatoHumano`, `encerrarConversa`
- [ ] Motor de score determinístico em `lib/agent/score.ts` — o LLM coleta, o código pontua
- [ ] Route Handler de streaming `app/api/chat/route.ts`
- [ ] Widget de chat: streaming, indicador de digitação, erro, retomada de sessão
- [ ] Escape para humano disponível em qualquer turno
- [ ] Rate limiting e BotID no endpoint
- [ ] Bateria de evals (PRD §9)

### Fase 4 — Dados, roteamento e LGPD
- [ ] Provisionar Postgres via `vercel integration`
- [ ] Tabelas `leads` e `conversations`
- [ ] `lib/leads/sink.ts` → `deliverLead()` como ponto único de saída
- [ ] Botão `wa.me` com mensagem pré-preenchida e protocolo
- [ ] E-mail ao corretor com resumo e transcript; confirmação ao lead
- [ ] Captura de UTM e referrer — sem isso não se mede o Google Ads
- [ ] LGPD: consentimento explícito, base legal, retenção do transcript, canal de exclusão
- [ ] Segredos apenas em `vercel env`
- [ ] Teste end-to-end com dado real

### Fase 5 — Instrumentação
- [ ] Vercel Analytics e Speed Insights
- [ ] Eventos: `page_view`, `chat_opened`, `chat_first_message`, `qualification_completed`, `lead_created`, `lead_A`
- [ ] Painel em rota protegida com as contagens por segmento
- [ ] Métricas do agente: abandono por turno, duração média, custo por conversa
- [ ] Tag de conversão do Google Ads e pixel do Meta para remarketing
- [ ] Ligar os números da página aos KPIs da célula

### Fase 6 — QA, segurança e go-live
- [ ] QA cross-browser e cross-device
- [ ] Teste de prompt injection e de vazamento de system prompt
- [ ] Teste de carga leve e verificação do teto de custo por conversa
- [ ] Core Web Vitals e acessibilidade em produção
- [ ] **Revisão regulatória SUSEP** do copy das duas páginas
- [ ] Publicação sob `mxseguros.com.br`, SSL, redirects
- [ ] Treinar a dupla: o que o lead já respondeu, como ler o transcript, SLA do lead A
- [ ] Deploy e monitoramento nas primeiras 48 h

### Fase 7 — Operação e otimização
- [ ] Revisão semanal do funil, junto da reunião de pipeline de 15–20 min já prevista no plano comercial
- [ ] Recalibrar prompt e score com o feedback do closer sobre lead bom x ruim
- [ ] A/B: headline, CTA, abertura do chat, número de perguntas
- [ ] Ship 2

---

## 7. Estrutura de arquivos

```
app/[segmento]/page.tsx          página por segmento (Server Component)
app/layout.tsx                   metadata, fontes, analytics
app/api/chat/route.ts            agente — streaming, runtime Node.js
app/politica-de-privacidade/     LGPD
lib/segments/config.ts           copy, coberturas, perguntas e regras por segmento
components/sections/*.tsx        hero, dores, como-funciona, coberturas, provas, faq, cta
components/chat/*.tsx            widget de chat (client)
lib/agent/prompt.ts              system prompt e guardrails
lib/agent/schema.ts              schema Zod do lead
lib/agent/score.ts               motor A/B/C + flag conta_tecnica
lib/leads/sink.ts                deliverLead()
lib/db/schema.ts                 leads, conversations
```

---

## 8. Riscos

| Risco | Impacto | Mitigação |
|---|---|---|
| Agente cotar preço ou prometer cobertura | Regulatório (SUSEP) | Guardrails em prompt + evals dedicadas + revisão jurídica antes do go-live |
| Bots consumindo tokens no chat | Custo | BotID, rate limit por IP e sessão, teto de turnos por conversa |
| Lead A chegar e ninguém responder | Perde a venda e o investimento em mídia | SLA acordado na Fase 0, notificação imediata, cobrança na reunião semanal |
| Célula não usar o CRM | *"O que não está no CRM não existe"* | Treinamento na Fase 6; o lead chega estruturado, não em texto solto |
| Chat afastar o visitante mais tradicional | Conversão | Formulário de fallback sempre visível; telefone no topo |
| Burocracia da Meta atrasar o WhatsApp | Cronograma | `wa.me` no Ship 1 tira a Meta do caminho crítico |

---

## 9. Verificação

1. `next build` sem erro de tipo; Lighthouse ≥ 90 em Performance e Acessibilidade nas duas rotas.
2. Rodar as evals do PRD §9 e conferir o score esperado em cada uma; confirmar recusa de cotação e resistência a prompt injection.
3. End-to-end em preview: conversar como síndico com vencimento próximo → registro no Postgres com score A, segmento `condominio`, UTM preenchida, e-mail recebido com o transcript.
4. Conta técnica: conversar como comprador de indústria → lead salvo com flag `conta_tecnica` e roteado ao closer, **não** descartado.
5. Fallback: enviar o formulário sem tocar no chat → lead chega igual.
6. Conformidade: enviar sem consentimento LGPD → bloqueia.
7. Produção: gerar um lead de teste e cronometrar até a resposta da célula, contra o SLA.

---

## 10. Pendências do cliente

**Bloqueiam o go-live**
1. CNPJ e registro SUSEP da corretora — não constam no site e são obrigatórios no rodapé
2. Logo em vetor e versão positiva — só existe o PNG negativo público
3. Direito de uso dos logos das seguradoras parceiras e dos clientes

**Bloqueiam a Fase 4**
4. SLA do lead A: em quantos minutos e em que horário
5. Número de WhatsApp de destino — o (19) 3863-8150 institucional ou um dedicado da célula. **Recomendação: dedicado**, senão não há como medir o funil nem cobrar SLA
6. Qual CRM a célula vai ativar

**Bloqueia o deploy final**
7. Quem administra o WordPress e o DNS, e se as páginas entram como rewrite de subpasta (`mxseguros.com.br/empresas`) ou subdomínio. **Rewrite é melhor para SEO**, mas exige acesso à configuração do servidor.

---

## 11. Observação fora de escopo

O site vende **Agronegócios** e a região (Itapira, Mogi Guaçu, Espírito Santo do Pinhal) é agrícola, mas o plano comercial não cita agro em nenhuma das três fases. Pode ser um segmento com intenção de busca própria sendo negligenciado. Registrado para avaliação no Ship 2 — **não incluído no Ship 1**.
