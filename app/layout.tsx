import type { Metadata } from 'next';
import { Inter, Fraunces } from 'next/font/google';
import { urlBase, ehProducaoReal } from '@/lib/site';
import './globals.css';

const body = Inter({
  subsets: ['latin'],
  variable: '--font-body',
  display: 'swap',
});

/**
 * Serif com eixo óptico para os títulos. A MX é de 2002 e fala com dono de
 * comércio e síndico — solidez comunica melhor que cara de startup.
 */
const display = Fraunces({
  subsets: ['latin'],
  variable: '--font-display-face',
  display: 'swap',
  axes: ['SOFT', 'WONK', 'opsz'],
});

export const metadata: Metadata = {
  metadataBase: new URL(urlBase()),
  title: {
    default: 'MX Seguros — Seguro empresarial em Itapira',
    template: '%s',
  },
  description:
    'Corretora de seguros de Itapira desde 2002. Seguro empresarial, condominial e de frota com cotação em várias seguradoras e atendimento presencial.',
  openGraph: { type: 'website', locale: 'pt_BR', siteName: 'MX Seguros' },
  // Fora do domínio real, nenhum buscador deve indexar (ver lib/site.ts).
  robots: ehProducaoReal()
    ? { index: true, follow: true }
    : { index: false, follow: false },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${body.variable} ${display.variable}`} suppressHydrationWarning>
      <head>
        {/*
          Aplica o tema salvo antes da primeira pintura. Sem isto a página
          abriria no tema do sistema e piscaria ao trocar na hidratação.
        */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var t=localStorage.getItem('mx-tema');if(t)document.documentElement.dataset.theme=t}catch(e){}`,
          }}
        />
      </head>
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
