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
            // input: false — role/siteId must NEVER be client-assignable via the
            // sign-up body (privilege escalation). They are set server-side by
            // routes/register.js and routes/usermgmt.js via direct db.update.
            role: {
                type:         'string',
                required:     false,
                defaultValue: 'investigator',
                input:        false,
            },
            siteId: {
                type:     'number',
                required: false,
                input:    false,
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
