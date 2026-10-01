import fs from 'fs';
import path from 'path';
import { pool } from '../config/database';
import { logger } from '../config/logger';

async function main() {
  const dir = __dirname;
  const files = fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  await pool.query(`
    CREATE TABLE IF NOT EXISTS _migrations (
      name TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  for (const f of files) {
    const { rows } = await pool.query<{ name: string }>(
      'SELECT name FROM _migrations WHERE name = $1',
      [f]
    );
    if (rows.length > 0) {
      logger.info(`Migration already applied: ${f}`);
      continue;
    }
    const sql = fs.readFileSync(path.join(dir, f), 'utf8');
    logger.info(`Applying migration: ${f}`);
    await pool.query('BEGIN');
    try {
      await pool.query(sql);
      await pool.query('INSERT INTO _migrations(name) VALUES ($1)', [f]);
      await pool.query('COMMIT');
    } catch (err) {
      await pool.query('ROLLBACK');
      logger.error(`Migration failed: ${f}`, { error: (err as Error).message });
      throw err;
    }
  }

  logger.info('All migrations applied');
  await pool.end();
}

main().catch((e) => {
  logger.error('Migration runner failed', { error: (e as Error).message });
  process.exit(1);
});
