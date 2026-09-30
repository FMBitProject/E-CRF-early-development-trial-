// Trusted local operation. Read one JSON object from stdin; never pass a password on the command line.
import 'dotenv/config';
import crypto from 'node:crypto';
import { eq, sql } from 'drizzle-orm';
import { hashPassword } from '@better-auth/utils/password';
import { client, db } from '../src/backend/db/connection.js';
import { user, account, organizations, passwordMeta } from '../src/backend/db/schemas/schema.js';
import { writeAudit } from '../src/backend/lib/audit.js';
import { validatePassword } from '../src/backend/lib/passwordpolicy.js';
import { validCredentials } from '../src/backend/lib/http-security.js';

try {
    let input = '';
    for await (const chunk of process.stdin) {
        input += chunk;
        if (input.length > 4096) throw new Error('Input too large');
    }
    const data = JSON.parse(input);
    if (!validCredentials(data) || typeof data.name !== 'string' || !data.name.trim() || data.name.length > 200 ||
        !['admin', 'platform_owner'].includes(data.role) || data.acceptedLicense !== true) {
        throw new Error('Provide name, email, password, role (admin/platform_owner), and acceptedLicense: true');
    }
    const email = data.email.trim().toLowerCase();
    const errors = validatePassword(data.password, email);
    if (errors.length) throw new Error(errors.join('; '));
    const hash = await hashPassword(data.password);
    await db.transaction(async tx => {
        await tx.execute(sql`SELECT pg_advisory_xact_lock(918372)`);
        const [existing] = await tx.select({ id: user.id }).from(user).where(eq(user.email, email));
        if (existing) throw new Error('Account already exists; this command never promotes existing accounts');
        let organizationId = null;
        if (data.role === 'admin') {
            const [org] = await tx.insert(organizations).values({ name: 'Default Organization', slug: 'default' })
                .onConflictDoUpdate({ target: organizations.slug, set: { slug: 'default' } }).returning({ id: organizations.id });
            organizationId = org.id;
        }
        const id = crypto.randomUUID();
        await tx.insert(user).values({ id, name: data.name.trim(), email, emailVerified: true, role: data.role, organizationId });
        await tx.insert(account).values({ id: crypto.randomUUID(), accountId: id, providerId: 'credential', userId: id, password: hash });
        await tx.insert(passwordMeta).values({ userId: id, lastChangedAt: new Date(), mustChange: false });
        await writeAudit(tx, {
            tableName: 'license_acceptance', recordId: id, action: 'AGREE', newValue: '1.0',
            reason: 'Trusted local administrator provisioning; terms and privacy policy accepted',
            user: { id, name: data.name.trim(), role: data.role, organizationId }, ipAddress: null,
        });
    });
    console.log('Administrator provisioned. Sign in using the supplied credentials.');
} catch (error) {
    console.error('Provisioning failed:', error.code || 'INVALID_INPUT_OR_DATABASE_OPERATION');
    process.exitCode = 1;
} finally {
    await client.end();
}
