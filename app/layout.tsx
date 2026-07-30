import type { Metadata } from 'next';
import { Inter, Fraunces } from 'next/font/google';
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
  metadataBase: new URL('https://mxseguros.com.br'),
  title: {
    default: 'MX Seguros — Seguro empresarial em Itapira',
    template: '%s',
  },
  description:
    'Corretora de seguros de Itapira desde 2002. Seguro empresarial, condominial e de frota com cotação em várias seguradoras e atendimento presencial.',
  openGraph: { type: 'website', locale: 'pt_BR', siteName: 'MX Seguros' },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${body.variable} ${display.variable}`}>
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
