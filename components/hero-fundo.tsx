'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import Image from 'next/image';
import type { FotoHero } from '@/lib/segments/config';

/** Quanto cada foto fica no ar. A barrinha do dot ativo usa o mesmo valor. */
const INTERVALO_MS = 7000;

interface Slider {
  fotos: FotoHero[];
  atual: number;
  pausado: boolean;
  ir: (i: number) => void;
  passo: (delta: number) => void;
}

const SliderCtx = createContext<Slider | null>(null);

/**
 * Rotação automática do fundo do hero.
 *
 * Envolve o conteúdo do hero em vez de ser irmão dele por dois motivos: o
 * `onMouseEnter`/`onFocus` de pausa precisa cobrir a área toda, e os controles
 * (`<ControlesFundo />`) vivem dentro da coluna de texto, longe daqui — o
 * contexto é o que liga os dois sem levantar estado para a página, que é
 * server component.
 *
 * As fotos são decorativas: quem carrega o sentido do hero é o h1. Por isso a
 * camada inteira é `aria-hidden` e os alts só aparecem nos rótulos dos botões.
 */
export function HeroFundo({
  fotos,
  children,
}: {
  fotos: FotoHero[];
  children: React.ReactNode;
}) {
  const [atual, setAtual] = useState(0);
  const [pausado, setPausado] = useState(false);
  const [reduzido, setReduzido] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sincroniza = () => setReduzido(mq.matches);
    sincroniza();
    mq.addEventListener('change', sincroniza);
    return () => mq.removeEventListener('change', sincroniza);
  }, []);

  // `atual` na lista de dependências é o que reinicia a contagem quando o
  // visitante navega na mão — sem isso a próxima troca viria antes da hora.
  useEffect(() => {
    if (reduzido || pausado || fotos.length < 2) return;
    const id = setTimeout(() => setAtual((i) => (i + 1) % fotos.length), INTERVALO_MS);
    return () => clearTimeout(id);
  }, [atual, pausado, reduzido, fotos.length]);

  const ctx: Slider = {
    fotos,
    atual,
    pausado: pausado || reduzido,
    ir: (i) => setAtual(((i % fotos.length) + fotos.length) % fotos.length),
    passo: (d) => setAtual((i) => (i + d + fotos.length) % fotos.length),
  };

  return (
    <SliderCtx.Provider value={ctx}>
      <div
        onMouseEnter={() => setPausado(true)}
        onMouseLeave={() => setPausado(false)}
        onFocus={() => setPausado(true)}
        onBlur={() => setPausado(false)}
      >
        <div aria-hidden className="absolute inset-0 -z-10 bg-navy">
          {fotos.map((f, i) => (
            <Image
              key={f.src}
              src={f.src}
              alt=""
              fill
              // Só a primeira é LCP; as outras podem chegar depois do texto.
              priority={i === 0}
              sizes="100vw"
              className={`object-cover object-[center_45%] transition-opacity duration-1000 ${
                i === atual ? 'opacity-100' : 'opacity-0'
              }`}
            />
          ))}
        </div>

        <div
          aria-hidden
          className="absolute inset-0 -z-10 bg-[linear-gradient(95deg,rgba(7,27,52,.97)_0%,rgba(7,27,52,.93)_32%,rgba(7,27,52,.7)_58%,rgba(7,27,52,.4)_100%)] max-md:bg-[linear-gradient(to_top,rgba(7,27,52,.97)_12%,rgba(7,27,52,.88)_55%,rgba(7,27,52,.72)_100%)]"
        />

        {children}
      </div>
    </SliderCtx.Provider>
  );
}

/** Dots com barra de progresso + setas. Renderiza nada quando só há uma foto. */
export function ControlesFundo({ className = '' }: { className?: string }) {
  const s = useContext(SliderCtx);
  if (!s || s.fotos.length < 2) return null;

  return (
    <div
      className={`flex items-center gap-4 border-t border-sage/20 pt-4 ${className}`}
      aria-roledescription="carrossel"
      aria-label="Fotos do plano de fundo"
    >
      <div className="flex gap-2">
        {s.fotos.map((f, i) => (
          <button
            key={f.src}
            type="button"
            onClick={() => s.ir(i)}
            aria-current={i === s.atual}
            aria-label={`Foto ${i + 1} de ${s.fotos.length}: ${f.alt}`}
            className="flex h-11 w-10 items-center"
          >
            <span className="block h-[3px] w-full overflow-hidden rounded-full bg-sage/25">
              {i === s.atual && (
                <i
                  // Remontar a cada troca é o que reinicia a animação da barra.
                  key={s.atual}
                  className={`block h-full origin-left bg-sage ${
                    s.pausado ? 'scale-x-100' : 'animate-[mx-preenche_linear_forwards]'
                  }`}
                  style={s.pausado ? undefined : { animationDuration: `${INTERVALO_MS}ms` }}
                />
              )}
            </span>
          </button>
        ))}
      </div>

      <div className="flex gap-1.5">
        {([['‹', -1, 'Foto anterior'], ['›', 1, 'Próxima foto']] as const).map(
          ([glifo, delta, rotulo]) => (
            <button
              key={rotulo}
              type="button"
              onClick={() => s.passo(delta)}
              aria-label={rotulo}
              className="grid size-11 place-items-center rounded-lg border border-sage/30 text-lg leading-none text-[#C6CFDA] transition hover:border-sage hover:text-sage"
            >
              {glifo}
            </button>
          ),
        )}
      </div>
    </div>
  );
}
