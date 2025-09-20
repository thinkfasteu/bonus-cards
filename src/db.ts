import 'dotenv/config';
import { Pool, PoolClient, QueryResult, QueryResultRow } from 'pg';

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // keep TLS on, but don't require a trusted CA (dev/pilot-friendly)
  ssl: { rejectUnauthorized: false }
});

export async function dbHealth() {
  const r = await pool.query('select now() as now');
  return r.rows[0].now as Date;
}

export async function closeDb() {
  await pool.end();
}

// Query helper for parameterized queries
export async function query<T extends QueryResultRow = any>(text: string, params?: any[]): Promise<QueryResult<T>> {
  return pool.query<T>(text, params);
}

// Transaction helper
export async function withTransaction<T>(
  callback: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

// Query helper for use within transactions
export async function queryInTransaction<T extends QueryResultRow = any>(
  client: PoolClient,
  text: string,
  params?: any[]
): Promise<QueryResult<T>> {
  return client.query<T>(text, params);
}
