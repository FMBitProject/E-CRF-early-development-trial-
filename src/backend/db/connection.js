import 'dotenv/config';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schemas/schema.js';
import { formatNotice } from '../lib/pgnotice.js';

export const client = postgres(process.env.DATABASE_URL, {
    max:          10,    // connection pool size
    idle_timeout: 20,    // release idle connections after 20s (good for serverless)
    connect_timeout: 10, // fail fast if DB unreachable
    // Surface the notices that matter and drop the rest — see lib/pgnotice.js
    // for why "the rest" is 157 lines per restart. PG_NOTICE_VERBOSE=true
    // brings them all back when diagnosing a migration.
    onnotice: (notice) => {
        const line = formatNotice(notice, { verbose: process.env.PG_NOTICE_VERBOSE === 'true' });
        if (line) console.warn(line);
    },
});
export const db = drizzle(client, { schema });
