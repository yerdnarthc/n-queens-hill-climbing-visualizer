/**
 * Ambient module declarations for side-effect style/asset imports
 * (e.g. `import './globals.css'` in `src/app/layout.tsx`).
 *
 * Next.js resolves these at build time, so no runtime types exist.
 * The declarations satisfy TypeScript under `noUncheckedSideEffectImports`
 * (enforced by some editor TS versions even when not set in tsconfig),
 * preventing "Cannot find module ... for side-effect import" diagnostics.
 */
declare module '*.css';
