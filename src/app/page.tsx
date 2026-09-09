import { redirect } from 'next/navigation';

/**
 * Root route — the visualizer is the landing experience, served from
 * `/visualizer`. This page immediately (307 Temporary Redirect — see
 * D-060 for why not 308 Permanent) sends every visitor there.
 *
 * Query forwarding matters: old share links point at `/?n=…&seed=…`.
 * `searchParams` is async in Next 15+, so it must be awaited before
 * reading. Every param is forwarded verbatim (nuqs re-validates them
 * on the visualizer side), preserving shared configurations.
 */
export default async function Home({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (typeof value === 'string') {
      query.set(key, value);
    } else if (Array.isArray(value)) {
      for (const item of value) query.append(key, item);
    }
  }
  const suffix = query.size > 0 ? `?${query.toString()}` : '';
  redirect(`/visualizer${suffix}`);
}
