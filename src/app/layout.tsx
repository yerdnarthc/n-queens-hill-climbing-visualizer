import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { ThemeProvider } from '@/components/theme-provider';
import { TooltipProvider } from '@/components/ui/tooltip';
import { SiteNav } from '@/components/site-nav';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: {
    default: 'N-Queens Hill Climbing Visualizer',
    template: '%s | N-Queens Visualizer',
  },
  description:
    'An interactive educational visualizer for the N-Queens problem solved with hill climbing — real-time optimization landscape, convergence analytics, and six algorithm variants.',
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
      'Watch hill climbing solve the N-Queens puzzle in real time — with optimization landscape, analytics, and six algorithm variants.',
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
            <SiteNav />
            {children}
          </TooltipProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
