import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { SEGMENTOS, SLUGS, ehSegmento, MX_SITE, SEGURADORAS } from '@/lib/segments/config';
import { ChatQualificacao } from '@/components/chat/chat-qualificacao';
import { FormularioFallback } from '@/components/chat/formulario-fallback';

type Props = { params: Promise<{ segmento: string }> };

export function generateStaticParams() {
  return SLUGS.map((segmento) => ({ segmento }));
}

/**
 * A página é estática, mas o bloco de urgência do hero cita o mês corrente.
 * Sem revalidação o `new Date()` seria avaliado uma vez no build e a página
 * ficaria dizendo "estamos em julho" para sempre. Um dia de revalidação
 * mantém o texto correto sem abrir mão de servir HTML pronto do CDN.
 */
export const revalidate = 86400;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { segmento } = await params;
  if (!ehSegmento(segmento)) return {};
  const c = SEGMENTOS[segmento];
  return {
    title: c.meta.title,
    description: c.meta.description,
    alternates: { canonical: `/${segmento}` },
    openGraph: { title: c.meta.title, description: c.meta.description, images: [c.foto] },
  };
}

export default async function PaginaSegmento({ params }: Props) {
  const { segmento } = await params;
  if (!ehSegmento(segmento)) notFound();
  const c = SEGMENTOS[segmento];

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd(c.meta.description)) }}
      />

      <header className="sticky top-0 z-50 border-b border-white/10 bg-navy">
        <div className="mx-auto flex h-[70px] max-w-6xl items-center gap-6 px-5">
          <Link href="/" className="shrink-0">
            <Image src="/logo-sage.png" alt="MX Corretora de Seguros" width={430} height={72} className="h-7 w-auto" priority />
          </Link>
          <nav className="ml-auto hidden gap-6 lg:flex">
            {SLUGS.map((s) => (
              <Link
                key={s}
                href={`/${s}`}
                aria-current={s === segmento ? 'page' : undefined}
                className={`border-b py-1 text-sm transition ${
                  s === segmento
                    ? 'border-sage text-sage'
                    : 'border-transparent text-[#A8B2BF] hover:border-sage hover:text-sage'
                }`}
              >
                {SEGMENTOS[s].nav}
              </Link>
            ))}
          </nav>
          <div className="ml-auto hidden text-right leading-tight lg:ml-0 lg:block">
            <a href={`tel:${MX_SITE.telefoneLink}`} className="block text-sm font-semibold text-sage">
              {MX_SITE.telefone}
            </a>
            <span className="text-[0.66rem] text-[#A8B2BF]">Gente de verdade, {MX_SITE.horario}</span>
          </div>
          {/* No mobile o header só tinha o logo: quem queria ligar precisava
              rolar a página inteira até o rodapé. */}
          <a
            href={`tel:${MX_SITE.telefoneLink}`}
            className="ml-auto inline-flex min-h-11 items-center gap-2 rounded-lg border border-sage/40 px-3 text-sm font-semibold text-sage lg:hidden"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="size-4" aria-hidden>
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.79 19.79 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.9.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z" />
            </svg>
            Ligar
          </a>
        </div>
      </header>

      <main>
        {/* ---------- HERO ---------- */}
        <section className="relative isolate overflow-hidden bg-navy">
          <Image
            src={c.foto}
            alt={c.fotoAlt}
            fill
            priority
            sizes="100vw"
            className="object-cover object-[center_45%]"
          />
          <div
            aria-hidden
            className="absolute inset-0 bg-[linear-gradient(95deg,rgba(7,27,52,.97)_0%,rgba(7,27,52,.93)_32%,rgba(7,27,52,.7)_58%,rgba(7,27,52,.4)_100%)] max-md:bg-[linear-gradient(to_top,rgba(7,27,52,.97)_12%,rgba(7,27,52,.88)_55%,rgba(7,27,52,.72)_100%)]"
          />
          <div className="relative mx-auto grid max-w-6xl gap-7 px-5 py-9 lg:grid-cols-[1.02fr_.98fr] lg:items-center lg:gap-10 lg:py-20">
            <div className="max-w-[58ch] text-[#EDEDE6]">
              <span className="inline-flex items-center gap-2 rounded-full border border-[#D98324]/45 bg-[#D98324]/15 px-3 py-1.5 font-mono text-[0.68rem] tracking-[0.1em] text-[#F0B372] uppercase">
                <span className="size-1.5 rounded-full bg-[#D98324]" />
                {c.urgencia}
              </span>
              <h1 className="mt-4 text-[clamp(1.85rem,1.15rem+3.4vw,3.5rem)] leading-[1.1] font-semibold">
                {c.titulo}
              </h1>
              <p className="mt-3 max-w-[52ch] text-[0.98rem] text-[#C6CFDA] lg:text-lg">{c.subtitulo}</p>
              <Prazo />
              <ul className="mt-6 hidden flex-wrap gap-2 border-t border-sage/20 pt-5 lg:flex">
                {[
                  ['No mercado desde', String(MX_SITE.desde)],
                  ['Cotamos em', `${SEGURADORAS.length} seguradoras`],
                  ['Escritório no', 'centro de Itapira'],
                ].map(([k, v]) => (
                  <li
                    key={k}
                    className="rounded-full border border-sage/20 bg-sage/10 px-3 py-1.5 text-xs text-[#A8B2BF]"
                  >
                    {k} <b className="font-semibold text-sage">{v}</b>
                  </li>
                ))}
              </ul>
            </div>
            <ChatQualificacao segmento={c.slug} />
          </div>
        </section>

        {/* ---------- SEGURADORAS ---------- */}
        <div className="border-y border-rule bg-surface py-8">
          <div className="mx-auto max-w-6xl px-5">
            <p className="mb-4 text-center font-mono text-[0.64rem] tracking-[0.14em] text-ink-faint uppercase">
              Cotamos a sua apólice nas principais seguradoras do país
            </p>
            <ul className="flex gap-2 overflow-x-auto pb-1 md:justify-center">
              {SEGURADORAS.map((s) => (
                <li
                  key={s.slug}
                  className="grid h-14 shrink-0 basis-[104px] place-items-center rounded-lg border border-navy/10 bg-white px-3 md:flex-1 md:basis-0"
                >
                  <Image
                    src={`/seguradoras/${s.slug}.png`}
                    alt={s.nome}
                    width={160}
                    height={56}
                    className="h-7 w-auto max-w-full object-contain"
                  />
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* ---------- CENÁRIOS ---------- */}
        <section className="border-b border-rule bg-surface-2 py-16 md:py-24">
          <div className="mx-auto max-w-6xl px-5">
            <Cabecalho eyebrow="O cenário" titulo={c.cenariosTitulo} lede={c.cenariosLede} />
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {c.cenarios.slice(0, 4).map((x) => (
                <li key={x.titulo} className="rounded-xl border border-rule bg-surface p-6">
                  <h3 className="text-[1.08rem] font-semibold">{x.titulo}</h3>
                  <p className="mt-2 text-[0.92rem] text-ink-mid">{x.texto}</p>
                </li>
              ))}
            </ul>
            <details className="group mt-4">
              <summary className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-rule bg-surface px-4 py-2.5 text-sm font-medium transition hover:border-accent hover:text-accent">
                Ver mais {c.cenarios.length - 4} cenários
                <span className="transition group-open:rotate-45">+</span>
              </summary>
              <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {c.cenarios.slice(4).map((x) => (
                  <li key={x.titulo} className="rounded-xl border border-rule bg-surface p-6">
                    <h3 className="text-[1.08rem] font-semibold">{x.titulo}</h3>
                    <p className="mt-2 text-[0.92rem] text-ink-mid">{x.texto}</p>
                  </li>
                ))}
              </ul>
            </details>
          </div>
        </section>

        {/* ---------- COMO FUNCIONA ---------- */}
        <section className="bg-navy py-16 text-[#EDEDE6] md:py-24">
          <div className="mx-auto max-w-6xl px-5">
            <Cabecalho
              eyebrow="Como funciona"
              titulo="Da conversa ao corretor, sem formulário perdido"
              escuro
            />
            <ol className="grid gap-8 sm:grid-cols-3">
              {[
                ['Você conversa', 'Seis perguntas objetivas sobre o seu negócio, o seguro atual e quando ele vence. Sem cadastro para começar.'],
                ['A gente organiza', 'O sistema monta o perfil de risco e encaminha ao corretor certo da célula B2B, com prioridade por urgência.'],
                ['Um corretor te chama', 'Uma pessoa da MX entra em contato no WhatsApp já sabendo do que você precisa. Você não repete nada.'],
              ].map(([t, d], i) => (
                <li key={t} className="border-t-2 border-sage pt-5">
                  <span className="font-mono text-xs tracking-[0.1em] text-sage">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <h3 className="mt-2 text-[1.1rem] font-semibold">{t}</h3>
                  <p className="mt-2 text-[0.92rem] text-[#A8B2BF]">{d}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* ---------- COBERTURAS ---------- */}
        <section className="py-16 md:py-24">
          <div className="mx-auto max-w-6xl px-5">
            <Cabecalho
              eyebrow="Coberturas"
              titulo={c.coberturasTitulo}
              lede="O corretor monta o pacote conforme o risco real da sua operação. Nada aqui é cotação — preço e condições saem depois do diagnóstico."
            />
            <ul className="flex flex-wrap gap-2">
              {c.coberturas.map((x) => (
                <li
                  key={x}
                  className="inline-flex items-center gap-2 rounded-lg border border-rule bg-surface px-4 py-2.5 text-[0.9rem]"
                >
                  <span className="size-1.5 rounded-full bg-sage" />
                  {x}
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* ---------- DIFERENCIAIS ---------- */}
        <section className="border-y border-rule bg-surface-2 py-16 md:py-24">
          <div className="mx-auto max-w-6xl px-5">
            <Cabecalho
              eyebrow="Por que a MX"
              titulo="De Itapira a Águas de Lindoia, o corretor vai até a sua porta"
            />
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[
                ['Gente daqui', 'Escritório na Avenida Rio Branco e filial em Águas de Lindoia. Na hora do sinistro, alguém aparece — não é um protocolo em outro estado.'],
                ['Multicálculo, resposta no mesmo dia', 'Cotação simultânea nas principais seguradoras e comparativo claro de cobertura contra preço, para você decidir com dado na mão.'],
                ['Consultoria de risco', 'Primeiro a gente mapeia o que pode dar errado no seu negócio. A apólice vem depois, desenhada para isso — não do catálogo.'],
                ['Pós-venda que lembra de você', 'Aviso de vencimento, revisão anual da cobertura e suporte durante o sinistro. É onde a maioria das corretoras some.'],
              ].map(([t, d]) => (
                <li key={t} className="rounded-xl border border-rule bg-surface p-6">
                  <h3 className="text-[1.08rem] font-semibold">{t}</h3>
                  <p className="mt-2 text-[0.92rem] text-ink-mid">{d}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* ---------- FAQ ---------- */}
        <section className="py-16 md:py-24">
          <div className="mx-auto max-w-6xl px-5">
            <Cabecalho eyebrow="Dúvidas" titulo="O que costumam perguntar antes de começar" />
            <div className="flex max-w-3xl flex-col gap-2">
              {FAQ.map(([q, a]) => (
                <details
                  key={q}
                  className="rounded-xl border border-rule bg-surface px-5 py-4 open:border-accent"
                >
                  <summary className="flex cursor-pointer list-none items-center gap-4 font-semibold">
                    {q}
                    <span className="ml-auto text-accent">+</span>
                  </summary>
                  <p className="mt-3 text-[0.92rem] text-ink-mid">{a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>
        {/* ---------- FALLBACK ---------- */}
        <section className="border-t border-sage/20 bg-navy py-16 text-[#EDEDE6] md:py-24">
          <div className="mx-auto grid max-w-6xl gap-9 px-5 lg:grid-cols-2 lg:items-start">
            <div>
              <Cabecalho
                eyebrow="Prefere não conversar agora?"
                titulo="Deixe seus dados que um corretor procura você"
                lede="Nem todo mundo quer responder perguntas na tela — e tudo bem. Este formulário chega no mesmo lugar que a conversa, só sem a qualificação pronta."
                escuro
              />
              <p className="text-[0.9rem] text-[#A8B2BF]">
                Ou ligue direto:{' '}
                <a
                  href={`tel:${MX_SITE.telefoneLink}`}
                  className="inline-flex min-h-11 items-center font-semibold text-sage"
                >
                  {MX_SITE.telefone}
                </a>
              </p>
            </div>
            <FormularioFallback segmento={c.slug} />
          </div>
        </section>
      </main>

      <Rodape />
    </>
  );
}

function Prazo() {
  const M = ['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];
  const agora = new Date();
  const prox = new Date(agora.getFullYear(), agora.getMonth() + 1, 1);
  return (
    <p className="mt-4 text-sm text-[#93A1B1]">
      Estamos em <b className="font-semibold text-sage">{M[agora.getMonth()]}</b>. Apólice que
      vence em <b className="font-semibold text-sage">{M[prox.getMonth()]}</b> precisa entrar em
      cotação agora — comparar seguradoras leva alguns dias úteis.
    </p>
  );
}

function Cabecalho({
  eyebrow, titulo, lede, escuro,
}: { eyebrow: string; titulo: string; lede?: string; escuro?: boolean }) {
  return (
    <div className="mb-10 flex max-w-[60ch] flex-col gap-3">
      <p className={`font-mono text-[0.68rem] tracking-[0.16em] uppercase ${escuro ? 'text-sage' : 'text-accent'}`}>
        {eyebrow}
      </p>
      <h2 className="text-[clamp(1.7rem,1.1rem+1.9vw,2.5rem)] leading-tight font-semibold">{titulo}</h2>
      {lede && <p className={`text-[1.06rem] ${escuro ? 'text-[#A8B2BF]' : 'text-ink-mid'}`}>{lede}</p>}
    </div>
  );
}

function Rodape() {
  return (
    <footer className="border-t border-sage/20 bg-navy py-12 text-[#A8B2BF]">
      <div className="mx-auto max-w-6xl px-5">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <Image src="/logo-white.png" alt="MX Corretora de Seguros, desde 2002" width={180} height={180} className="size-20" />
          </div>
          <div className="text-[0.86rem]">
            <h3 className="mb-2 font-mono text-[0.64rem] tracking-[0.13em] text-sage uppercase">Matriz</h3>
            <address className="leading-relaxed not-italic">
              {MX_SITE.matriz.rua}<br />
              {MX_SITE.matriz.bairro} · {MX_SITE.matriz.cidade}/{MX_SITE.matriz.uf}<br />
              CEP {MX_SITE.matriz.cep}
            </address>
          </div>
          <div className="text-[0.86rem]">
            <h3 className="mb-2 font-mono text-[0.64rem] tracking-[0.13em] text-sage uppercase">Filial</h3>
            <address className="leading-relaxed not-italic">
              {MX_SITE.filial.rua}<br />
              {MX_SITE.filial.bairro} · {MX_SITE.filial.cidade}/{MX_SITE.filial.uf}
            </address>
          </div>
          <div className="text-[0.86rem]">
            <h3 className="mb-2 font-mono text-[0.64rem] tracking-[0.13em] text-sage uppercase">Contato</h3>
            <address className="leading-relaxed not-italic">
              <a href={`tel:${MX_SITE.telefoneLink}`} className="inline-flex min-h-11 items-center">
                {MX_SITE.telefone}
              </a>
              <br />
              <a href={`mailto:${MX_SITE.email}`} className="inline-flex min-h-11 items-center break-all">
                {MX_SITE.email}
              </a>
            </address>
          </div>
        </div>
        <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-sage/15 pt-5 text-xs">
          <span>{MX_SITE.nome} · desde {MX_SITE.desde}</span>
          <span>CNPJ {MX_SITE.cnpj ?? <Pendente />}</span>
          <span>Registro SUSEP {MX_SITE.susep ?? <Pendente />}</span>
        </div>
      </div>
    </footer>
  );
}

/** Marcador visível de propositalmente-faltando — some quando a MX enviar o dado. */
function Pendente() {
  return (
    <b className="rounded bg-sage px-1.5 font-mono text-[0.66rem] font-bold text-navy">PENDENTE</b>
  );
}

const FAQ: [string, string][] = [
  ['Estou falando com uma pessoa ou com um robô?', 'Com um assistente automático da MX, e ele avisa isso logo de início. Ele só organiza as informações — quem analisa o risco, cota e assina é um corretor habilitado da nossa equipe. A qualquer momento você pode pedir para falar direto com uma pessoa.'],
  ['O assistente vai me dar o preço do seguro?', 'Não. Preço de seguro empresarial depende de vistoria, histórico e do perfil de risco do seu negócio — qualquer número dado antes disso seria chute. O assistente levanta o cenário e o corretor traz a cotação real das seguradoras.'],
  ['Quanto tempo leva a conversa?', 'Cerca de três minutos. São seis perguntas, uma de cada vez, e você pode parar onde quiser — o que já respondeu chega ao corretor mesmo assim.'],
  ['Vocês atendem fora de Itapira?', 'Sim. Mogi Guaçu, Mogi Mirim, Espírito Santo do Pinhal, Lindóia e Águas de Lindoia fazem parte da nossa área de atendimento presencial.'],
  ['O que vocês fazem com os meus dados?', 'Usamos exclusivamente para preparar sua cotação e entrar em contato, conforme a LGPD. Não vendemos nem compartilhamos com terceiros fora do processo de cotação, e você pode pedir a exclusão a qualquer momento pelo mxseguros@mxseguros.com.br.'],
  ['Já tenho corretor. Vale conversar?', 'Vale se a sua apólice está perto de vencer. A comparação é gratuita e sem compromisso — se a cobertura que você já tem for melhor, a gente vai te dizer isso.'],
];

function jsonLd(description: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'InsuranceAgency',
    name: MX_SITE.nome,
    description,
    telephone: MX_SITE.telefone,
    email: MX_SITE.email,
    foundingDate: String(MX_SITE.desde),
    areaServed: [
      'Itapira', 'Mogi Guaçu', 'Mogi Mirim',
      'Espírito Santo do Pinhal', 'Lindóia', 'Águas de Lindoia',
    ],
    address: {
      '@type': 'PostalAddress',
      streetAddress: MX_SITE.matriz.rua,
      addressLocality: MX_SITE.matriz.cidade,
      addressRegion: MX_SITE.matriz.uf,
      postalCode: MX_SITE.matriz.cep,
      addressCountry: 'BR',
    },
  };
}
