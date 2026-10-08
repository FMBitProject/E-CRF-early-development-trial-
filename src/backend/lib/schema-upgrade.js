// Persist successful schema versions across serverless instances. The
// transaction lock also prevents concurrent cold starts from repeating DDL.
export async function upgradeSchemaOnce(client, version, upgrade) {
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
