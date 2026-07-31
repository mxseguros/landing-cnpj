'use client';

import { useEffect, useState } from 'react';

/**
 * Alternador de tema claro/escuro.
 *
 * O tema escolhido é gravado em localStorage e reaplicado antes da pintura
 * pelo script em `app/layout.tsx` — sem ele a página abriria no tema do
 * sistema e piscaria ao trocar na hidratação.
 */
export function AlternadorTema() {
  const [tema, setTema] = useState<'light' | 'dark' | null>(null);

  useEffect(() => {
    const atual = document.documentElement.dataset.theme as 'light' | 'dark' | undefined;
    setTema(atual ?? (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'));
  }, []);

  function alternar() {
    const proximo = tema === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = proximo;
    try {
      localStorage.setItem('mx-tema', proximo);
    } catch {
      // Modo privativo bloqueia localStorage — a troca vale para esta visita.
    }
    setTema(proximo);
  }

  return (
    <button
      type="button"
      onClick={alternar}
      aria-label={`Mudar para tema ${tema === 'dark' ? 'claro' : 'escuro'}`}
      className="grid size-11 shrink-0 place-items-center rounded-full border border-sage/35 text-[#A8B2BF] transition hover:border-sage hover:text-sage"
    >
      <svg viewBox="0 0 24 24" className="size-[18px]" aria-hidden>
        <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="1.8" />
        <path d="M12 3a9 9 0 0 0 0 18z" fill="currentColor" />
      </svg>
    </button>
  );
}
