'use client';

import { useState, useRef, useEffect } from 'react';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import type { Segmento } from '@/lib/agent/schema';
import { MX_SITE } from '@/lib/segments/config';

/**
 * Widget de qualificação — o único componente client da página.
 *
 * O agente conduz; aqui só há streaming, estado e o escape para humano.
 * Nenhuma regra de qualificação vive no cliente: quem decide o que perguntar
 * é o system prompt, e quem pontua é `lib/agent/score.ts` no servidor.
 */
export function ChatQualificacao({ segmento }: { segmento: Segmento }) {
  const [origem, setOrigem] = useState<Record<string, string>>({});
  const logRef = useRef<HTMLDivElement>(null);

  // UTMs vêm da URL, nunca do usuário — sem isso não há como medir o Google Ads.
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const o: Record<string, string> = {};
    for (const k of ['utm_source', 'utm_medium', 'utm_campaign'] as const) {
      const v = p.get(k);
      if (v) o[k.replace('utm_', 'utm').replace(/^utm/, 'utm')] = v;
    }
    if (p.get('utm_source')) o.utmSource = p.get('utm_source')!;
    if (p.get('utm_medium')) o.utmMedium = p.get('utm_medium')!;
    if (p.get('utm_campaign')) o.utmCampaign = p.get('utm_campaign')!;
    if (document.referrer) o.referrer = document.referrer;
    setOrigem(o);
  }, []);

  const { messages, sendMessage, status, error } = useChat({
    transport: new DefaultChatTransport({
      api: '/api/chat',
      body: { segmento, origem },
    }),
  });

  const [texto, setTexto] = useState('');
  const pensando = status === 'submitted' || status === 'streaming';

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, pensando]);

  function enviar(conteudo: string) {
    const t = conteudo.trim();
    if (!t || pensando) return;
    sendMessage({ text: t });
    setTexto('');
  }

  const vazio = messages.length === 0;

  return (
    <div className="flex min-h-[498px] flex-col overflow-hidden rounded-2xl border border-rule bg-surface shadow-[0_24px_60px_-28px_rgba(0,0,0,.45)]">
      <header className="flex items-center gap-3 border-b border-rule bg-surface-2 px-4 py-3">
        <span className="relative grid size-9 shrink-0 place-items-center rounded-full bg-navy">
          <span className="font-display text-sm font-semibold text-white">MX</span>
          <span className="absolute -right-px -bottom-px size-2.5 rounded-full border-2 border-surface-2 bg-[--color-whats]" />
        </span>
        <div className="leading-tight">
          <p className="text-sm font-semibold">MX Empresas</p>
          <p className="text-xs text-ink-faint">
            Assistente digital · um corretor humano assume depois
          </p>
        </div>
      </header>

      <div ref={logRef} className="flex max-h-[352px] flex-1 flex-col gap-3 overflow-y-auto p-4">
        {vazio && (
          <div className="m-auto max-w-xs text-center text-sm text-ink-faint">
            <p>
              Seis perguntas rápidas e um corretor da MX assume, já sabendo do que você
              precisa. Sem cadastro para começar.
            </p>
          </div>
        )}

        {messages.map((m) => {
          const texto = m.parts
            .filter((p): p is { type: 'text'; text: string } => p.type === 'text')
            .map((p) => p.text)
            .join('');
          if (!texto) return null;
          const meu = m.role === 'user';
          return (
            <div
              key={m.id}
              className={
                meu
                  ? 'max-w-[86%] self-end rounded-xl rounded-br-sm bg-navy px-3.5 py-2.5 text-[0.93rem] leading-relaxed text-white'
                  : 'max-w-[86%] self-start rounded-xl rounded-bl-sm bg-surface-2 px-3.5 py-2.5 text-[0.93rem] leading-relaxed'
              }
            >
              {texto}
            </div>
          );
        })}

        {pensando && (
          <div className="flex gap-1 self-start rounded-xl rounded-bl-sm bg-surface-2 px-3.5 py-3">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="size-1.5 animate-bounce rounded-full bg-ink-faint"
                style={{ animationDelay: `${i * 0.15}s` }}
              />
            ))}
          </div>
        )}

        {error && (
          <div className="self-start rounded-xl bg-surface-2 px-3.5 py-2.5 text-sm">
            <p className="text-ink-mid">
              Tive um problema para responder agora. Se preferir não esperar, ligue para{' '}
              <a href={`tel:${MX_SITE.telefoneLink}`} className="font-semibold text-accent">
                {MX_SITE.telefone}
              </a>{' '}
              — {MX_SITE.horario}.
            </p>
          </div>
        )}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          enviar(texto);
        }}
        className="flex items-center gap-2 border-t border-rule bg-surface p-3"
      >
        <label htmlFor="chat-msg" className="sr-only">
          Sua mensagem
        </label>
        <input
          id="chat-msg"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder={vazio ? 'Escreva aqui para começar…' : 'Sua resposta…'}
          autoComplete="off"
          className="min-w-0 flex-1 rounded-lg border border-rule bg-surface px-3 py-2.5 text-[0.93rem] outline-none placeholder:text-ink-faint focus-visible:border-accent"
        />
        <button
          type="submit"
          disabled={pensando || !texto.trim()}
          className="shrink-0 rounded-lg bg-navy px-4 py-2.5 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-40"
        >
          Enviar
        </button>
      </form>
    </div>
  );
}
