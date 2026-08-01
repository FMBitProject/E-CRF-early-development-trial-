import 'dotenv/config';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schemas/schema.js';

export const client = postgres(process.env.DATABASE_URL, {
    max:          10,    // connection pool size
    idle_timeout: 20,    // release idle connections after 20s (good for serverless)
    connect_timeout: 10, // fail fast if DB unreachable
    // Postgres NOTICE/WARNING messages carry things an operator must act on —
    // the startup migration raises one when crf_data_entries holds duplicates
    // and the unique index therefore could not be created. Left unset,
    // postgres-js prints them via console.log, where they read as ordinary
    // startup chatter. Route them to console.warn so they stand out and land
    // on stderr with the rest of the diagnostics.
    onnotice: (notice) => {
        const where = notice.severity ?? 'NOTICE';
        console.warn(`[postgres ${where}] ${notice.message ?? ''}`.trim());
    },
});
export const db = drizzle(client, { schema });
