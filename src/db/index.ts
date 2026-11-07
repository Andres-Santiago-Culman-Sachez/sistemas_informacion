import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import * as schema from './schema.ts';

dotenv.config({ path: '.env.local' });
dotenv.config();

declare global {
  var _neonPostgresPool: Pool | undefined;
}

const connectionString = process.env.DATABASE_URL || process.env.DATABASE_URL_UNPOOLED;

export const createPool = () => {
  if (!global._neonPostgresPool) {
    if (connectionString) {
      global._neonPostgresPool = new Pool({
        connectionString,
        max: 5,
        connectionTimeoutMillis: 15000,
        ssl: { rejectUnauthorized: false },
      });
    } else {
      global._neonPostgresPool = new Pool({
        host: process.env.SQL_HOST,
        user: process.env.SQL_USER,
        password: process.env.SQL_PASSWORD,
        database: process.env.SQL_DB_NAME,
        max: 5,
        connectionTimeoutMillis: 15000,
      });
    }

    global._neonPostgresPool.on('error', (err) => {
      console.error('Unexpected error on idle Neon SQL pool client:', err);
    });
  }
  return global._neonPostgresPool;
};

const pool = createPool();

export const db = drizzle(pool, { schema });
