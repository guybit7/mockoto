import type { Config } from 'drizzle-kit';

export default {
  schema: './src/app/db/schema.ts',
  out: './drizzle',
  dialect: 'sqlite',
  dbCredentials: {
    // relative to apps/mockoto-be/ — goes up to workspace root where the app creates data/
    url: '../../data/mockoto.db',
  },
} satisfies Config;
