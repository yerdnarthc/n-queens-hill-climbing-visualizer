import type { MetadataRoute } from 'next';

/**
 * Canonical site origin. Set `NEXT_PUBLIC_SITE_URL` in the deployment
 * environment (e.g. Vercel) for correct absolute URLs; falls back to localhost
 * for development.
 */
export function siteUrl(): string {
  const raw = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
  return raw.replace(/\/+$/, '');
}

export default function robots(): MetadataRoute.Robots {
  const base = siteUrl();
  return {
    rules: { userAgent: '*', allow: '/' },
    sitemap: `${base}/sitemap.xml`,
  };
}
