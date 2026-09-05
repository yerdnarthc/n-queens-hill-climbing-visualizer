// `eslint-config-next@16.x` ships a native flat-config array as its main
// export, so we can import it directly without the `@eslint/eslintrc`
// `FlatCompat` legacy bridge. (The bridge itself is fine in isolation, but
// it routes the resolved config through `ConfigValidator.formatErrors()`,
// which calls `JSON.stringify` on the offending config to render the
// validation error. Modern plugin instances (eslint-plugin-react@7.37+,
// typescript-eslint@8.x, eslint-plugin-import@2.32+) carry a circular
// back-reference in their `configs` registry, so the error reporter
// itself crashes with "Converting circular structure to JSON" — masking
// the real validation error. Importing the flat config directly skips
// that whole legacy pipeline. See eslint#20237 / next#85244 for the
// upstream discussions.)
import nextConfig from 'eslint-config-next';
import nextCoreWebVitals from 'eslint-config-next/core-web-vitals';
import nextTypescript from 'eslint-config-next/typescript';

const eslintConfig = [
  ...nextCoreWebVitals,
  ...nextTypescript,
  ...nextConfig,
  {
    ignores: [
      // `nextConfig` already covers `.next/**`, `out/**`, `build/**`,
      // and `next-env.d.ts`. We add the project-specific ones.
      'node_modules/**',
      '.agents/**',
      'e2e/**',
      'playwright-report/**',
      'test-results/**',
      'coverage/**',
    ],
  },
];

export default eslintConfig;
