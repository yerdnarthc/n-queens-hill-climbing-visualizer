import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import * as React from 'react';
import { ThemeProvider } from 'next-themes';

vi.mock('next/navigation', () => ({
  usePathname: () => '/',
}));

// next/link requires an app-router context in jsdom — mock it as a plain anchor.
vi.mock('next/link', async () => {
  const ReactModule = await import('react');
  return {
    default: (props: React.PropsWithChildren<{ href: string; className?: string }>) =>
      ReactModule.createElement(
        'a',
        {
          href: props.href,
          className: props.className,
        },
        props.children,
      ),
  };
});

import { SiteNav } from '@/components/site-nav';

describe('SiteNav', () => {
  beforeEach(() => {
    document.documentElement.classList.add('dark');
  });

  const renderNav = () =>
    render(
      <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
        <SiteNav />
      </ThemeProvider>,
    );

  it('renders both nav links with the expected routes', () => {
    renderNav();
    const visualizer = screen.getByRole('link', { name: /visualizer/i });
    const howItWorks = screen.getByRole('link', { name: /how it works/i });
    expect(visualizer).toHaveAttribute('href', '/');
    expect(howItWorks).toHaveAttribute('href', '/how-it-works');
  });

  it('marks the active page link', () => {
    renderNav();
    expect(screen.getByRole('link', { name: /visualizer/i }).className).toContain('bg-primary/10');
  });

  it('renders the global theme toggle', () => {
    renderNav();
    expect(screen.getByRole('button', { name: /toggle theme/i })).toBeInTheDocument();
  });
});
