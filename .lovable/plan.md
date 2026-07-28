# Export Full Database Schema (Postgres DDL)

## Goal
Produce a portable `schema.sql` file containing the complete DDL of your current Lovable Cloud (Postgres) database, so you can recreate the same structure on any standard Postgres instance. No existing DB logic, data, or app code will be changed — this is a read-only export.

## What the export will include
- All `public` schema objects:
  - Tables (all ~68 tables: profiles, orders, parts, credit_wallets, quotations, ai_*, admin_notifications, etc.) with columns, types, defaults, NOT NULL, primary keys, foreign keys, unique/check constraints, indexes.
  - Custom ENUM types (e.g. `app_role`, `customer_type`, `customer_status`, `activity_type`, `offer_discount_type`, etc.).
  - Sequences (e.g. `quotation_number_seq`, `statement_number_seq`).
  - Functions & triggers (`has_role`, `handle_new_user`, `wallet_debit`, `parts_search_trigger`, etc.).
  - RLS policies and GRANTs so security behavior is reproducible.
  - Views (if any).
- Storage bucket definitions listed as a comment reference (buckets live in the `storage` schema which is Supabase-managed; on plain Postgres they don't apply).
- **No data rows** — schema only. **No `auth`, `storage`, `realtime`, `vault`, `supabase_functions`, `pgmq`, `cron`, `net` schemas** (Supabase-managed; not portable to vanilla Postgres). References to `auth.users(id)` will be kept as-is — on a non-Supabase Postgres you'd point those to your own users table.

## How it will be produced
Since `pg_dump` isn't available from the sandbox on Lovable Cloud, the schema will be reconstructed by querying Postgres system catalogs (`information_schema` + `pg_catalog`) and `pg_get_*def()` helpers via read-only SQL. The output will be assembled into a single ordered file:

```text
1. CREATE TYPE (enums)
2. CREATE SEQUENCE
3. CREATE TABLE (+ defaults, constraints)
4. ALTER TABLE ... ADD FOREIGN KEY
5. CREATE INDEX
6. CREATE FUNCTION
7. CREATE TRIGGER
8. ALTER TABLE ... ENABLE ROW LEVEL SECURITY
9. CREATE POLICY
10. GRANT statements
```

## Deliverable
- `/mnt/documents/schema.sql` — single file, runnable on any Postgres 14+ instance with `pgcrypto` and `uuid-ossp` extensions enabled.
- `/mnt/documents/schema-README.md` — short notes on Supabase-specific bits (auth.users FKs, RLS `auth.uid()` calls) and what to adjust for a non-Supabase target.

## Out of scope
- No data export (that's a separate CSV/dump step — available via Cloud → Advanced settings → Export data if you also want the data).
- No changes to any table, function, policy, or app code.
- No edge-function or storage-bucket contents.

## Next step after approval
Switch to build mode; I'll run the catalog queries, assemble the two files under `/mnt/documents/`, and share the paths for you to download.
