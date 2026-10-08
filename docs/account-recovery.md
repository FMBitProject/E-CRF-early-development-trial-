# Recover a locked account

The login policy locks an account for 30 minutes after five failed attempts.
Wait for that period to expire, or have another administrator unlock the account
through Security. Repeated incorrect attempts after expiry can lock it again.

If the only administrator is locked, a trusted deployment operator can run the
following in the project terminal. The configured `DATABASE_URL` must point to
the database of the affected deployment; never paste its value into chat.

```sh
node scripts/unlock-account.mjs <<'JSON'
{"email":"admin@example.com","reason":"Account owner verified; recover administrator access"}
JSON
```

Replace the email and recovery reason. The operation resets the failed-attempt
counter and records an audit entry in the same transaction. It does not change
the password, role, organization, MFA configuration, or rate limits. A separate
rate-limit response (429) must still be allowed to expire.

A code deployment alone does not unlock an existing database account. If a
password was exposed, change it after regaining access.

If recovery reports that `DATABASE_URL` is missing, the Vercel environment
variables are not automatically available in your Codespace terminal. Create a
local `.env` file in the project root and add the same value used by the deployed
application:

```dotenv
DATABASE_URL=<PostgreSQL connection URL from Vercel or your database provider>
```

Keep this file private; never commit it or send its contents in chat. Run the
recovery command again after saving it. `.env.example` is only a template and is
not loaded as the active configuration.
