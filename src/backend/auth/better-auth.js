import 'dotenv/config';
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { db } from '../db/connection.js';
import * as schema from '../db/schemas/schema.js';

export const auth = betterAuth({
    database: drizzleAdapter(db, {
        provider: 'pg',
        schema: {
            user:         schema.user,
            session:      schema.session,
            account:      schema.account,
            verification: schema.verification,
        },
    }),
    secret:  process.env.BETTER_AUTH_SECRET,
    baseURL: process.env.BETTER_AUTH_URL ||
             (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000'),
    emailAndPassword: {
        enabled: true,
    },
    user: {
        additionalFields: {
            role: {
                type:         'string',
                required:     true,
                defaultValue: 'investigator',
                input:        true,
            },
        },
    },
    trustedOrigins: [
        process.env.BETTER_AUTH_URL || 'http://localhost:3000',
        process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null,
        // allow all *.vercel.app subdomains
        'https://*.vercel.app',
    ].filter(Boolean),
});
