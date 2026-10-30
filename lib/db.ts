import 'server-only';
import pg from 'pg';

// numeric -> number. Course data (scores, hours) is small and display-only.
pg.types.setTypeParser(1700, (v) => Number(v));

// One pool per process. HMR re-evaluates modules, so park it on globalThis or every
// edit would leak another pool.
const g = globalThis as unknown as { academyPool?: pg.Pool };

export function pool(): pg.Pool {
  if (!g.academyPool) {
    if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is not set (.env.local)');
    g.academyPool = new pg.Pool({
      connectionString: process.env.DATABASE_URL,
      application_name: 'cert-academy-site',
      max: 8,
    });
  }
  return g.academyPool;
}

export async function q<T extends pg.QueryResultRow>(sql: string, params: unknown[] = []): Promise<T[]> {
  const { rows } = await pool().query<T>(sql, params);
  return rows;
}

export const learner = () => process.env.ACADEMY_LEARNER ?? 'andrew';
