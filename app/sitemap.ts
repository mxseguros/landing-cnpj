import type { MetadataRoute } from 'next';
import { SLUGS } from '@/lib/segments/config';

export default function sitemap(): MetadataRoute.Sitemap {
  const base = 'https://mxseguros.com.br';
  return SLUGS.map((s) => ({
    url: `${base}/${s}`,
    lastModified: new Date(),
    changeFrequency: 'monthly' as const,
    priority: s === 'empresas' ? 1 : 0.8,
  }));
}
