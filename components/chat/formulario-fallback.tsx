'use client';

import { useState } from 'react';
import type { Segmento } from '@/lib/agent/schema';
import { MX_SITE, SEGMENTOS } from '@/lib/segments/config';

const VENCIMENTOS = [
  ['ate_30_dias', 'Este mês'],
  ['ate_90_dias', 'Nos próximos 3 meses'],
  ['mais_de_90_dias', 'Daqui a mais de 3 meses'],
  ['nao_tem_seguro', 'Não tenho seguro'],
] as const;

export function FormularioFallback({ segmento }: { segmento: Segmento }) {
  const [estado, setEstado] = useState<'aberto' | 'enviando' | 'ok' | 'erro'>('aberto');
  const [protocolo, setProtocolo] = useState('');
  // Produtor rural não tem "empresa" — pedir isso no rótulo faz a pessoa travar
  // ou inventar. O campo continua o mesmo, só o que se pede muda.
  const org = SEGMENTOS[segmento].rotuloEmpresa ?? {
    label: 'Empresa ou condomínio',
    placeholder: 'Nome do negócio',
  };

  async function enviar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setEstado('enviando');
    const f = new FormData(e.currentTarget);
    const p = new URLSearchParams(window.location.search);

    try {
      const r = await fetch('/api/lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome: f.get('nome'),
          empresa: f.get('empresa'),
          whatsapp: f.get('whatsapp'),
          email: f.get('email') || '',
          vencimento: f.get('vencimento'),
          website: f.get('website') || '',
          segmento,
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
      setEstado('ok');
    } catch {
      setEstado('erro');
    }
  }

  if (estado === 'ok') {
    return (
      <div className="rounded-2xl border border-brand-accent/25 bg-brand-2 p-8">
        <p className="font-display text-xl font-semibold text-brand-fg">
          Recebido. Um corretor da MX vai te procurar.
        </p>
        <p className="mt-3 text-sm text-brand-fg-mid">
          {protocolo && (
            <>
              Protocolo <b className="font-mono text-brand-accent">{protocolo}</b>.{' '}
            </>
          )}
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
    <form onSubmit={enviar} className="flex flex-col gap-4 rounded-2xl border border-brand-accent/25 bg-brand-2 p-6">
      {/* Honeypot: fora da ordem de tabulação e invisível para leitor de tela. */}
      <input
        type="text"
        name="website"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        className="absolute size-0 overflow-hidden opacity-0"
      />

      <Campo id="nome" rotulo="Seu nome" placeholder="Como podemos te chamar" />
      <Campo id="empresa" rotulo={org.label} placeholder={org.placeholder} />
      <Campo id="whatsapp" rotulo="WhatsApp" type="tel" placeholder="(19) 90000-0000" inputMode="tel" />
      <Campo id="email" rotulo="E-mail (opcional)" type="email" placeholder="voce@empresa.com.br" obrigatorio={false} />

      <div className="flex flex-col gap-1.5">
        <label htmlFor="vencimento" className="font-mono text-[0.64rem] tracking-[0.11em] text-brand-fg-mid uppercase">
          Quando vence seu seguro atual
        </label>
        <select
          id="vencimento"
          name="vencimento"
          defaultValue="ate_90_dias"
          className="min-h-11 rounded-lg border border-brand-accent/30 bg-white/5 px-3 py-2.5 text-[0.94rem] text-brand-fg"
        >
          {VENCIMENTOS.map(([v, t]) => (
            <option key={v} value={v} className="bg-brand">
              {t}
            </option>
          ))}
        </select>
      </div>

      <label className="flex items-start gap-2.5 py-1 text-[0.78rem] leading-relaxed text-brand-fg-mid">
        <input type="checkbox" name="lgpd" required className="size-6 shrink-0 accent-brand-accent" />
        <span>
          Autorizo a MX Seguros a usar meus dados para preparar a cotação e entrar em contato,
          conforme a LGPD.
        </span>
      </label>

      {estado === 'erro' && (
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
        disabled={estado === 'enviando'}
        className="min-h-12 rounded-lg bg-brand-accent px-4 font-semibold text-brand transition disabled:opacity-50"
      >
        {estado === 'enviando' ? 'Enviando…' : 'Quero ser procurado'}
      </button>
    </form>
  );
}

function Campo({
  id, rotulo, placeholder, type = 'text', obrigatorio = true, inputMode,
}: {
  id: string; rotulo: string; placeholder: string; type?: string;
  obrigatorio?: boolean; inputMode?: 'tel' | 'email' | 'text';
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
        autoComplete={id === 'whatsapp' ? 'tel' : id === 'email' ? 'email' : id === 'nome' ? 'name' : 'organization'}
        className="min-h-11 rounded-lg border border-brand-accent/30 bg-white/5 px-3 py-2.5 text-[0.94rem] text-brand-fg placeholder:text-brand-placeholder"
      />
    </div>
  );
}
