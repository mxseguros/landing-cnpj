'use client';

import { useId, useState } from 'react';
import { RAMO_LABEL_AGRO } from '@/lib/agent/config';
import { MX_SITE } from '@/lib/segments/config';

/**
 * Solicitação de orçamento do agro, com consulta ao CAR.
 *
 * O produtor digita o código do Cadastro Ambiental Rural e a página devolve o
 * contorno, o município e a área da propriedade — em vez de perguntar três
 * coisas que ele responderia de cabeça. Área é o número que mais pesa na
 * cotação rural e o que mais volta errado de formulário: vem a área da
 * matrícula, a área plantada ou um arredondamento de memória.
 *
 * A consulta é um atalho, nunca um pedágio. Ela fica num painel próprio, fora
 * do `<form>`: quem não sabe o código, tem o cadastro desatualizado ou pega o
 * registro fora do ar preenche a área na mão e envia do mesmo jeito. Travar o
 * envio no CAR trocaria um orçamento melhor por nenhum orçamento.
 */

/**
 * Sem isto o pedido chega sempre como score C.
 *
 * `ehDecisor()` (lib/agent/score.ts) só reconhece decisor pelo `papel`, e é ele
 * que separa o A do C: produtor com custeio em aberto e plantio em até 90 dias
 * é exatamente o lead que o corretor precisa atender no mesmo dia — mas, sem
 * saber quem está falando, o motor não tem como afirmar isso.
 */
const PAPEIS = [
  ['produtor', 'Sou o produtor / dono'],
  ['arrendatario', 'Arrendo a terra'],
  ['gestor_rural', 'Administro a propriedade'],
  ['outro', 'Outro'],
] as const;

const JANELAS = [
  ['ate_30_dias', 'Planto neste mês'],
  ['ate_90_dias', 'Planto nos próximos 3 meses'],
  ['mais_de_90_dias', 'Falta mais de 3 meses'],
  ['ja_plantei', 'Já plantei esta safra'],
  ['nao_se_aplica', 'Não planto — pecuária ou outra atividade'],
] as const;

/** Sai do mesmo mapa que o motor de score usa, para os dois não divergirem. */
const RAMOS = Object.entries(RAMO_LABEL_AGRO);

type Imovel = {
  codigo: string;
  uf: string;
  municipio: string;
  hectares: number;
  condicao?: string;
  tipo?: string;
  contorno: string[];
  centro: { lat: number; lon: number };
};

type EstadoBusca =
  | { fase: 'ocioso' }
  | { fase: 'buscando' }
  | { fase: 'achado'; imovel: Imovel }
  | { fase: 'erro'; mensagem: string };

export function SolicitacaoOrcamento() {
  const [busca, setBusca] = useState<EstadoBusca>({ fase: 'ocioso' });
  const [codigo, setCodigo] = useState('');
  const [envio, setEnvio] = useState<'aberto' | 'enviando' | 'ok' | 'erro'>('aberto');
  const [protocolo, setProtocolo] = useState('');

  const imovel = busca.fase === 'achado' ? busca.imovel : undefined;

  async function consultarCar() {
    const alvo = codigo.trim().toUpperCase();
    if (!alvo) return;
    setBusca({ fase: 'buscando' });
    try {
      const r = await fetch(`/api/farm-tools/car?codigo=${encodeURIComponent(alvo)}`);
      const j = await r.json();
      if (!r.ok) throw new Error(j?.erro || 'Não consegui consultar o registro agora.');
      setBusca({ fase: 'achado', imovel: j as Imovel });
    } catch (e) {
      setBusca({ fase: 'erro', mensagem: e instanceof Error ? e.message : 'Falha na consulta.' });
    }
  }

  async function enviar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setEnvio('enviando');
    const f = new FormData(e.currentTarget);
    const p = new URLSearchParams(window.location.search);
    const haDigitado = Number(f.get('hectares'));

    try {
      const r = await fetch('/api/orcamento', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome: f.get('nome'),
          propriedade: f.get('propriedade'),
          whatsapp: f.get('whatsapp'),
          email: f.get('email') || '',
          // Área e município conferidos ganham do que o produtor digitou; sem
          // consulta, vale o que ele informou — e o corretor é avisado da diferença.
          car: imovel?.codigo ?? (codigo.trim() || undefined),
          cidade: imovel?.municipio ?? (String(f.get('cidade') ?? '').trim() || undefined),
          hectares: imovel?.hectares ?? (haDigitado > 0 ? haDigitado : undefined),
          areaVerificada: Boolean(imovel),
          cultura: f.get('cultura') || undefined,
          janelaPlantio: f.get('janelaPlantio'),
          papel: f.get('papel'),
          temCreditoRural: f.get('credito') === 'on',
          ramos: f.getAll('ramos'),
          website: f.get('website') || '',
          consentimentoLgpd: f.get('lgpd') === 'on',
          origem: {
            utmSource: p.get('utm_source') ?? undefined,
            utmMedium: p.get('utm_medium') ?? undefined,
            utmCampaign: p.get('utm_campaign') ?? undefined,
            referrer: document.referrer || undefined,
          },
        }),
      });
      if (!r.ok) throw new Error(String(r.status));
      const j = await r.json();
      setProtocolo(j.protocolo ?? '');
      setEnvio('ok');
    } catch {
      setEnvio('erro');
    }
  }

  if (envio === 'ok') {
    return (
      <div className="rounded-2xl border border-brand-accent/25 bg-brand-2 p-8">
        <p className="text-xl font-semibold text-brand-fg">
          Pedido registrado. Um corretor da MX vai te procurar.
        </p>
        <p className="mt-3 text-sm text-brand-fg-mid">
          {protocolo && (
            <>
              Protocolo <b className="font-mono text-brand-accent">{protocolo}</b>.{' '}
            </>
          )}
          {imovel
            ? `Ele já recebe a propriedade em ${imovel.municipio} com ${formatarHa(imovel.hectares)} ha conferidos no CAR — você não vai precisar repetir isso.`
            : 'Ele já recebe o que você preencheu aqui — você não vai precisar repetir nada.'}
        </p>
        <p className="mt-3 text-sm text-brand-fg-mid">
          Se preferir não esperar, ligue para{' '}
          <a href={`tel:${MX_SITE.telefoneLink}`} className="font-semibold text-brand-accent">
            {MX_SITE.telefone}
          </a>
          .
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,0.85fr)_1fr] lg:items-start">
      <PainelCar
        codigo={codigo}
        estado={busca}
        onCodigo={(v) => {
          setCodigo(v);
          // Editar o código invalida o resultado anterior: sem isto o painel
          // seguiria mostrando a fazenda antiga enquanto o campo já diz outra.
          if (busca.fase !== 'ocioso') setBusca({ fase: 'ocioso' });
        }}
        onConsultar={consultarCar}
      />

      <form
        onSubmit={enviar}
        className="flex flex-col gap-4 rounded-2xl border border-brand-accent/25 bg-brand-2 p-6"
      >
        {/* Honeypot: fora da ordem de tabulação e invisível para leitor de tela. */}
        <input
          type="text"
          name="website"
          tabIndex={-1}
          autoComplete="off"
          aria-hidden="true"
          className="absolute size-0 overflow-hidden opacity-0"
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <Campo id="nome" rotulo="Seu nome" placeholder="Como podemos te chamar" autoComplete="name" />
          <Campo
            id="propriedade"
            rotulo="Propriedade ou fazenda"
            placeholder="Nome do sítio, chácara ou fazenda"
            autoComplete="organization"
          />
          <Campo id="whatsapp" rotulo="WhatsApp" type="tel" placeholder="(19) 90000-0000" inputMode="tel" autoComplete="tel" />
          <Campo
            id="email"
            rotulo="E-mail (opcional)"
            type="email"
            placeholder="voce@fazenda.com.br"
            obrigatorio={false}
            autoComplete="email"
          />
        </div>

        {/* Só aparece quando a consulta não resolveu: com o CAR conferido, pedir
            de novo o que o registro já disse é atrito puro. */}
        {!imovel && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Campo id="cidade" rotulo="Município" placeholder="Itapira" obrigatorio={false} autoComplete="address-level2" />
            <Campo
              id="hectares"
              rotulo="Área aproximada (ha)"
              type="number"
              placeholder="120"
              obrigatorio={false}
              inputMode="decimal"
            />
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <Campo
            id="cultura"
            rotulo="O que você produz"
            placeholder="Café, cana, milho, gado de corte…"
            obrigatorio={false}
          />
          <Selecao id="janelaPlantio" rotulo="Próximo plantio" opcoes={JANELAS} padrao="ate_90_dias" />
          <Selecao id="papel" rotulo="Na propriedade, você" opcoes={PAPEIS} padrao="produtor" />
        </div>

        <Coberturas />

        <label className="flex items-start gap-2.5 text-[0.82rem] leading-relaxed text-brand-fg-mid">
          <input type="checkbox" name="credito" className="size-6 shrink-0 accent-brand-accent" />
          <span>Tenho custeio, financiamento ou CPR em aberto</span>
        </label>

        <label className="flex items-start gap-2.5 py-1 text-[0.78rem] leading-relaxed text-brand-fg-mid">
          <input type="checkbox" name="lgpd" required className="size-6 shrink-0 accent-brand-accent" />
          <span>
            Autorizo a MX Seguros a usar meus dados para preparar a cotação e entrar em contato,
            conforme a LGPD.
          </span>
        </label>

        {envio === 'erro' && (
          <p className="text-[0.82rem] text-[#F0B372]">
            Não consegui enviar agora. Tente de novo, ou ligue para{' '}
            <a href={`tel:${MX_SITE.telefoneLink}`} className="font-semibold underline">
              {MX_SITE.telefone}
            </a>
            .
          </p>
        )}

        <button
          type="submit"
          disabled={envio === 'enviando'}
          className="min-h-12 rounded-lg bg-brand-accent px-4 font-semibold text-brand transition disabled:opacity-50"
        >
          {envio === 'enviando' ? 'Enviando…' : 'Pedir orçamento'}
        </button>

        <p className="text-[0.76rem] text-brand-fg-faint">
          Pedido de orçamento não é cotação nem proposta. Preço e condições saem depois que o
          corretor analisa o risco e consulta as seguradoras.
        </p>
      </form>
    </div>
  );
}

/** Painel de consulta ao CAR — fica fora do `<form>` para não competir com o envio. */
function PainelCar({
  codigo, estado, onCodigo, onConsultar,
}: {
  codigo: string;
  estado: EstadoBusca;
  onCodigo: (v: string) => void;
  onConsultar: () => void;
}) {
  const id = useId();

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-brand-accent/25 bg-brand-2 p-6">
      <div className="flex flex-col gap-1.5">
        <label htmlFor={id} className="font-mono text-[0.64rem] tracking-[0.11em] text-brand-fg-mid uppercase">
          Código do CAR (opcional)
        </label>
        <p className="text-[0.82rem] text-brand-fg-mid">
          Se você tiver o código do Cadastro Ambiental Rural em mãos, a gente já puxa o contorno,
          o município e a área da propriedade — e você não precisa estimar nada.
        </p>
        <div className="mt-1 flex flex-col gap-2 sm:flex-row">
          <input
            id={id}
            value={codigo}
            onChange={(e) => onCodigo(e.target.value)}
            // Enter aqui consulta em vez de não fazer nada: o campo está fora
            // do form, e o produtor não tem como saber disso.
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                onConsultar();
              }
            }}
            placeholder="SP-3523107-XXXXXXXX…"
            spellCheck={false}
            autoCapitalize="characters"
            autoComplete="off"
            aria-describedby={`${id}-estado`}
            className="min-h-11 w-full rounded-lg border border-brand-accent/30 bg-white/5 px-3 py-2.5 font-mono text-[0.82rem] text-brand-fg uppercase placeholder:text-brand-placeholder placeholder:normal-case"
          />
          <button
            type="button"
            onClick={onConsultar}
            disabled={estado.fase === 'buscando' || !codigo.trim()}
            className="min-h-11 shrink-0 rounded-lg border border-brand-accent/40 px-4 text-sm font-semibold text-brand-accent transition disabled:opacity-40"
          >
            {estado.fase === 'buscando' ? 'Buscando…' : 'Buscar'}
          </button>
        </div>
      </div>

      {/* Região viva: o resultado chega depois de uma requisição, e quem usa
          leitor de tela precisa ser avisado sem ter que sair procurando. */}
      <div id={`${id}-estado`} aria-live="polite">
        {estado.fase === 'buscando' && (
          <p className="text-[0.84rem] text-brand-fg-mid">
            Procurando a propriedade no registro do CAR…
          </p>
        )}

        {estado.fase === 'erro' && (
          <p className="text-[0.84rem] text-[#F0B372]">
            {estado.mensagem} Sem problema: preencha a área aproximada ao lado e siga com o pedido.
          </p>
        )}

        {estado.fase === 'achado' && <Resultado imovel={estado.imovel} />}
      </div>

      {estado.fase === 'ocioso' && (
        <p className="text-[0.76rem] text-brand-fg-faint">
          Não sabe o código? Siga sem ele — o corretor levanta a área com você na conversa.
        </p>
      )}
    </div>
  );
}

function Resultado({ imovel }: { imovel: Imovel }) {
  return (
    <div className="flex gap-4 rounded-xl border border-brand-accent/25 bg-white/5 p-4">
      <svg
        viewBox="0 0 100 100"
        className="size-24 shrink-0 text-brand-accent"
        role="img"
        aria-label={`Contorno da propriedade em ${imovel.municipio}`}
      >
        {/* Um único caminho com evenodd para que reserva legal e outros anéis
            internos apareçam como vazio, e não pintados por cima do talhão. */}
        <path
          d={imovel.contorno.join(' ')}
          fill="currentColor"
          fillOpacity={0.2}
          fillRule="evenodd"
          stroke="currentColor"
          strokeWidth={1.5}
          strokeLinejoin="round"
        />
      </svg>

      <div className="min-w-0">
        <p className="text-2xl leading-none font-semibold text-brand-fg">
          {formatarHa(imovel.hectares)}
          <span className="ml-1 text-sm font-normal text-brand-fg-mid">hectares</span>
        </p>
        <p className="mt-1.5 text-[0.9rem] text-brand-fg">
          {imovel.municipio}/{imovel.uf}
        </p>
        {(imovel.tipo || imovel.condicao) && (
          <p className="mt-0.5 text-[0.76rem] text-brand-fg-faint">
            {[imovel.tipo, imovel.condicao].filter(Boolean).join(' · ')}
          </p>
        )}
        <p className="mt-2 text-[0.72rem] leading-relaxed text-brand-fg-faint">
          Área calculada do contorno do CAR, aproximada. O corretor confirma na cotação.
        </p>
      </div>
    </div>
  );
}

function Coberturas() {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-1 font-mono text-[0.64rem] tracking-[0.11em] text-brand-fg-mid uppercase">
        O que você quer cotar
      </legend>
      <div className="grid gap-x-4 gap-y-1 sm:grid-cols-2">
        {RAMOS.map(([chave, rotulo]) => (
          <label
            key={chave}
            className="flex items-center gap-2.5 py-1 text-[0.84rem] text-brand-fg-mid"
          >
            <input
              type="checkbox"
              name="ramos"
              value={chave}
              // Lavoura é o motivo de quase toda visita à página do agro; deixar
              // tudo vazio faria o envio falhar na validação de "pelo menos um".
              defaultChecked={chave === 'agricola'}
              className="size-5 shrink-0 accent-brand-accent"
            />
            {rotulo}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function Campo({
  id, rotulo, placeholder, type = 'text', obrigatorio = true, inputMode, autoComplete,
}: {
  id: string; rotulo: string; placeholder: string; type?: string;
  obrigatorio?: boolean; inputMode?: 'tel' | 'email' | 'text' | 'decimal'; autoComplete?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="font-mono text-[0.64rem] tracking-[0.11em] text-brand-fg-mid uppercase">
        {rotulo}
      </label>
      <input
        id={id}
        name={id}
        type={type}
        inputMode={inputMode}
        placeholder={placeholder}
        required={obrigatorio}
        min={type === 'number' ? 0 : undefined}
        step={type === 'number' ? 'any' : undefined}
        autoComplete={autoComplete}
        className="min-h-11 rounded-lg border border-brand-accent/30 bg-white/5 px-3 py-2.5 text-[0.94rem] text-brand-fg placeholder:text-brand-placeholder"
      />
    </div>
  );
}

function Selecao({
  id, rotulo, opcoes, padrao,
}: {
  id: string; rotulo: string; opcoes: readonly (readonly [string, string])[]; padrao: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="font-mono text-[0.64rem] tracking-[0.11em] text-brand-fg-mid uppercase">
        {rotulo}
      </label>
      <select
        id={id}
        name={id}
        defaultValue={padrao}
        className="min-h-11 rounded-lg border border-brand-accent/30 bg-white/5 px-3 py-2.5 text-[0.94rem] text-brand-fg"
      >
        {opcoes.map(([v, t]) => (
          <option key={v} value={v} className="bg-brand">
            {t}
          </option>
        ))}
      </select>
    </div>
  );
}

/** Hectare com casa decimal só quando ela diz alguma coisa. */
function formatarHa(ha: number): string {
  return ha.toLocaleString('pt-BR', { maximumFractionDigits: 1 });
}
