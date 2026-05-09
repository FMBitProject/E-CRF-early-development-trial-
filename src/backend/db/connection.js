import 'dotenv/config';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schemas/schema.js';

export const client = postgres(process.env.DATABASE_URL, {
    max:          10,    // connection pool size
    idle_timeout: 20,    // release idle connections after 20s (good for serverless)
    connect_timeout: 10, // fail fast if DB unreachable
});
export const db = drizzle(client, { schema });
