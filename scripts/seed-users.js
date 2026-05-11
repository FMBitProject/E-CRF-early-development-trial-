/**
 * Seed test accounts for each clinical role.
 * Inserts directly into DB with emailVerified=true — no verification code needed.
 * Run: node scripts/seed-users.js
 */
import 'dotenv/config';
import { hashPassword } from '@better-auth/utils/password';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { eq } from 'drizzle-orm';
import * as schema from '../src/backend/db/schemas/schema.js';

const client = postgres(process.env.DATABASE_URL, { max: 1 });
const db = drizzle(client, { schema });

const TEST_USERS = [
    { name: 'Dr. Siti Aminah',  email: 'pi@trial.dev',           role: 'pi',           password: 'Trial@PI2025!' },
    { name: 'Dr. Budi Santoso', email: 'investigator@trial.dev',  role: 'investigator', password: 'Trial@Inv2025!' },
    { name: 'Dewi Rahayu',      email: 'cra@trial.dev',           role: 'cra',          password: 'Trial@CRA2025!' },
    { name: 'Rina Kusuma',      email: 'crc@trial.dev',           role: 'crc',          password: 'Trial@CRC2025!' },
];

async function run() {
    for (const u of TEST_USERS) {
        const existing = await db.select({ id: schema.user.id })
            .from(schema.user)
            .where(eq(schema.user.email, u.email));

        if (existing.length > 0) {
            console.log(`⚠  Skip (already exists): ${u.email}`);
            continue;
        }

        const userId = crypto.randomUUID();
        const accountId = crypto.randomUUID();
        const hash = await hashPassword(u.password);

        await db.insert(schema.user).values({
            id:            userId,
            name:          u.name,
            email:         u.email,
            emailVerified: true,
            role:          u.role,
            createdAt:     new Date(),
            updatedAt:     new Date(),
        });

        await db.insert(schema.account).values({
            id:         accountId,
            accountId:  userId,
            providerId: 'credential',
            userId,
            password:   hash,
            createdAt:  new Date(),
            updatedAt:  new Date(),
        });

        // password_meta for ICH GCP policy tracking
        await db.insert(schema.passwordMeta)
            .values({ userId, lastChangedAt: new Date(), mustChange: false })
            .onConflictDoNothing();

        console.log(`✓  Created [${u.role.padEnd(12)}] ${u.email}  pw: ${u.password}`);
    }

    console.log('\nDone.');
    await client.end();
}

run().catch(err => {
    console.error('Error:', err.message);
    process.exit(1);
});
