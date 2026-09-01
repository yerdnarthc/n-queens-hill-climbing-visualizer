import type { MetadataRoute } from 'next';
import { siteUrl } from './robots';

export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteUrl();
  return [
    {
      url: base,
      changeFrequency: 'monthly',
      priority: 1,
    },
    {
      url: `${base}/how-it-works`,
      changeFrequency: 'monthly',
      priority: 0.7,
    },
  ];
}
