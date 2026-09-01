import type { Metadata } from 'next';
import localFont from 'next/font/local';
import { NuqsAdapter } from 'nuqs/adapters/next/app';
import './globals.css';
import { ThemeProvider } from '@/components/theme-provider';
import { TooltipProvider } from '@/components/ui/tooltip';
import { SiteNav } from '@/components/site-nav';

/**
 * Self-hosted Geist / Geist Mono (offline-safe) — no Google Fonts request at
 * build or runtime. Variable TTFs live in `src/assets/fonts/`; the CSS variable
 * names match the previous `next/font/google` setup so `globals.css` (and the
 * `--font-*` token consumers) are unchanged.
 */
const geistSans = localFont({
  src: [
    {
      path: '../assets/fonts/Geist-VariableFont_wght.ttf',
      weight: '100 900',
      style: 'normal',
    },
    {
      path: '../assets/fonts/Geist-Italic-VariableFont_wght.ttf',
      weight: '100 900',
      style: 'italic',
    },
  ],
  variable: '--font-geist-sans',
  display: 'swap',
});

const geistMono = localFont({
  src: [
    {
      path: '../assets/fonts/GeistMono-VariableFont_wght.ttf',
      weight: '100 900',
      style: 'normal',
    },
    {
      path: '../assets/fonts/GeistMono-Italic-VariableFont_wght.ttf',
      weight: '100 900',
      style: 'italic',
    },
  ],
  variable: '--font-geist-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'N-Queens Hill Climbing Visualizer',
    template: '%s | N-Queens Visualizer',
  },
  description:
    'An interactive educational visualizer for the N-Queens problem solved with hill climbing — real-time optimization landscape, convergence analytics, and five hill-climbing strategies plus sideways-move & random-restart policies.',
  keywords: [
    'N-Queens',
    'hill climbing',
    'local search',
    'algorithm visualization',
    'artificial intelligence',
    'optimization',
  ],
  openGraph: {
    title: 'N-Queens Hill Climbing Visualizer',
    description:
      'Watch hill climbing solve the N-Queens puzzle in real time — with optimization landscape, analytics, and five hill-climbing strategies plus two policies.',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem={false}
          disableTransitionOnChange
        >
          <TooltipProvider>
            <NuqsAdapter>
              <SiteNav />
              {children}
            </NuqsAdapter>
          </TooltipProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
