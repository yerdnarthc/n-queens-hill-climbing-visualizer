'use client';

import * as React from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useTheme } from 'next-themes';
import { Sun, Moon, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

const NAV_LINKS = [
  { href: '/', label: 'Visualizer' },
  { href: '/how-it-works', label: 'How It Works' },
] as const;

/**
 * SiteNav — persistent top navigation shared across pages (Phase 5).
 *
 * Renders the brand, page links (active state via usePathname), and the global
 * theme toggle (relocated from `StatsHeader` so it persists on every page).
 * Lives inside the ThemeProvider from the root layout.
 */
export function SiteNav() {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <nav className="sticky top-0 z-40 border-b border-border/80 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-3 px-4 py-2.5 sm:px-6 lg:px-8">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary/90 to-primary/40 text-primary-foreground shadow-inner shadow-white/20">
            <Zap className="h-4 w-4 fill-current" />
          </div>
          <span className="text-sm font-bold tracking-tight">
            N-Queens <span className="text-muted-foreground">Visualizer</span>
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          {NAV_LINKS.map((link) => {
            const isActive = link.href === '/' ? pathname === '/' : pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  'rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground',
                )}
              >
                {link.label}
              </Link>
            );
          })}

          {mounted && (
            <button
              type="button"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              aria-label="Toggle theme"
              className="ml-1 flex h-9 w-9 items-center justify-center rounded-lg border border-border/60 text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
            >
              {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}
