import type { MetadataRoute } from 'next';
import { ehProducaoReal, urlBase, DOMINIO_PRODUCAO } from '@/lib/site';

export default function robots(): MetadataRoute.Robots {
  // Staging indexável competiria com mxseguros.com.br nas mesmas buscas.
  if (!ehProducaoReal()) {
    return { rules: { userAgent: '*', disallow: '/' } };
  }
  return {
    rules: { userAgent: '*', allow: '/', disallow: '/api/' },
    sitemap: `https://${DOMINIO_PRODUCAO}/sitemap.xml`,
    host: urlBase(),
  };
}
