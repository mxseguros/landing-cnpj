import { redirect } from 'next/navigation';

/**
 * A raiz não tem página própria: cada segmento é uma landing autônoma, com
 * campanha e intenção de busca distintas. `/empresas` é o segmento âncora
 * (casa com o Google Ads de "seguro empresarial Itapira").
 */
export default function Home() {
  redirect('/empresas');
}
