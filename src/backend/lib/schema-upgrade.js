// Persist successful schema versions across serverless instances. The
// transaction lock also prevents concurrent cold starts from repeating DDL.
export async function upgradeSchemaOnce(client, version, upgrade) {
    // Most instances start against an already upgraded database. Avoid a write
    // transaction and the global migration lock on this common path.
    try {
        const [applied] = await client`SELECT version FROM app_schema_versions WHERE version = ${version}`;
        if (applied) return false;
    } catch (error) {
        if (error.code !== '42P01') throw error;
    }
    return client.begin(async tx => {
        await tx`SELECT pg_advisory_xact_lock(918374)`;
        await tx`CREATE TABLE IF NOT EXISTS app_schema_versions (
            version TEXT PRIMARY KEY, applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )`;
        const [applied] = await tx`SELECT version FROM app_schema_versions WHERE version = ${version}`;
        if (applied) return false;
        await upgrade(tx);
        await tx`INSERT INTO app_schema_versions (version) VALUES (${version})`;
        return true;
    });
}
