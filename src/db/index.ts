import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

// ---------------------------------------------------------------------------
// Drizzle client – uses postgres.js driver
// ---------------------------------------------------------------------------

const connectionString = process.env.DATABASE_URL!;

/**
 * postgres.js connection instance.
 * Uses a connection pool by default (max 10 connections).
 */
const client = postgres(connectionString);

/**
 * Drizzle ORM instance with full relational schema.
 * Use `db.query.<table>` for the relational query API, or
 * `db.select()` / `db.insert()` etc. for the SQL-like API.
 */
export const db = drizzle(client, { schema });

export type Database = typeof db;
