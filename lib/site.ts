/**
 * De onde o site está sendo servido.
 *
 * Enquanto as páginas não estiverem sob `mxseguros.com.br`, todo ambiente é
 * staging — e staging indexável competiria no Google com o domínio real,
 * exatamente nas buscas que este projeto existe para ganhar ("seguro
 * empresarial Itapira"). Por isso a indexação só é liberada no domínio de
 * produção; em qualquer outro host o robots bloqueia tudo.
 */

export const DOMINIO_PRODUCAO = 'mxseguros.com.br';

/** Host efetivo do deploy atual. Em dev cai no localhost. */
export function hostAtual(): string {
  const vercel =
    process.env.VERCEL_PROJECT_PRODUCTION_URL ?? process.env.VERCEL_URL ?? '';
  if (vercel) return vercel;
  return `localhost:${process.env.PORT ?? 3000}`;
}

export function urlBase(): string {
  const host = hostAtual();
  const protocolo = host.startsWith('localhost') ? 'http' : 'https';
  return `${protocolo}://${host}`;
}

/** Só o domínio real da MX pode ser indexado. */
export function ehProducaoReal(): boolean {
  return hostAtual().endsWith(DOMINIO_PRODUCAO);
}
