/// <reference types='vitest' />
import { defineConfig } from 'vite';
import { nxViteTsPaths } from '@nx/vite/plugins/nx-tsconfig-paths.plugin';

export default defineConfig(() => ({
  root: __dirname,
  cacheDir: '../../node_modules/.vite/apps/mockoto-be',
  plugins: [nxViteTsPaths()],
  test: {
    name: 'mockoto-be',
    watch: false,
    globals: true,
    environment: 'node',
    include: ['src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts}'],
    pool: 'forks',
    reporters: ['default', 'verbose'],
    coverage: {
      reportsDirectory: '../../coverage/apps/mockoto-be',
      provider: 'v8' as const,
      include: ['src/app/**/*.ts'],
      exclude: ['src/app/db/seed.ts', 'src/main.ts'],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 75,
        statements: 80,
      },
      reporter: ['text', 'lcov', 'html'],
    },
  },
}));
