# Database Connection Setup - Supabase Postgres

## Quick Start

The database connection is now working! Run `npm run db:test` to verify.

## What Was Fixed

The connection issues were resolved by making these changes:

### 1. **Correct Session Pooler Port**
- **Before**: Port `5432` (direct connection)
- **After**: Port `6543` (Session pooler via Supavisor)
- **Why**: Session pooler provides better connection management for applications

### 2. **URL-Encoded Password**
- **Before**: `8rdCym$a&jFmQMz?`
- **After**: `8rdCym%24a%26jFmQMz%3F`
- **Why**: Special characters (`$`, `&`, `?`) in passwords must be URL-encoded for proper parsing

### 3. **Removed Conflicting SSL Environment Variable**
- **Before**: `PGSSLMODE=no-verify` in `.env`
- **After**: Removed (handled in code)
- **Why**: Let the Node.js pg client control SSL settings directly

## Environment Setup

### 1. .env File Location
Place your `.env` file in the project root (same directory as `package.json`).

### 2. Getting the Session Pooler URI
1. Go to your Supabase project dashboard
2. Navigate to **Settings** → **Database**
3. Under **Connection string**, select **Session**
4. Copy the URI (it should end with `:6543/postgres`)

### 3. Handling Passwords with Special Characters
If your database password contains special characters, URL-encode them:
- `$` becomes `%24`
- `&` becomes `%26`
- `?` becomes `%3F`
- `+` becomes `%2B`
- `@` becomes `%40`

### 4. Database Password Reset (if needed)
If you don't know your database password:
1. Go to Supabase project dashboard
2. Navigate to **Settings** → **Database**
3. Click **Reset password**
4. Copy the new password and update your `.env` file
5. **Warning**: This will affect all applications using the database

## Testing Connection

```bash
npm run db:test
```

Expected output:
```
DB OK, server time: 2025-09-20T06:27:08.537Z
```

## Current Configuration

The connection uses:
- **SSL**: Enabled with `rejectUnauthorized: false` (pilot-friendly)
- **Pooler**: Session pooler (port 6543)
- **Region**: EU Central (aws-1-eu-central-1)
- **Connection**: Supavisor-managed pooling

## Troubleshooting

If you encounter issues:

1. **Check environment loading**: `npx ts-node scripts/print-env.ts`
2. **Verify URL format**: Ensure host ends with `pooler.supabase.com:6543`
3. **Password encoding**: Use URL encoding for special characters
4. **Network**: Corporate firewalls may block port 6543

For development, if Supabase remains blocked, you can temporarily use local Postgres:
```env
DATABASE_URL="postgres://postgres:devpass@localhost:5432/postgres"
```