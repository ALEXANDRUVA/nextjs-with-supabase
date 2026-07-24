# VimmoAI Supabase schema

The migrations in this directory are the source of truth for the VimmoAI
database, RPC functions, Row Level Security policies, and private Storage
buckets.

## Existing production project

The first migration is a baseline for a project that already has an `orders`
table. Before applying it to production:

1. Back up the Supabase database.
2. Compare the live `orders` columns and RPC signatures with
   `migrations/20260722000100_vimmoai_core.sql`.
3. Run `supabase db push --dry-run` against a staging project.
4. Apply the migration to staging and test with two normal users plus one
   administrator.
5. Apply it to production only after the staging checks pass.

The migration intentionally fails when existing order values violate the new
constraints. Correct invalid data explicitly instead of weakening or silently
bypassing a constraint.

## Local database verification

The database test suite uses pgTAP and runs inside a transaction. It creates
two temporary Auth users, verifies user/admin isolation, exercises the upload
and analysis RPCs, and checks both private Storage buckets.

```bash
npx supabase start
npx supabase db reset --local
npx supabase test db
```

`supabase start` requires Docker. The test transaction is rolled back, so the
temporary users, orders, and Storage objects are not retained.

The same commands run in `.github/workflows/database-tests.yml` for every pull
request that changes the Supabase directory. This keeps production credentials
out of the test job: the workflow uses only the local Supabase stack.

## Staging deployment

Do not link this directory to production for the first run. With a dedicated
staging project and an authenticated Supabase CLI:

```bash
npm run supabase:check-target -- YOUR_STAGING_PROJECT_REF
npx supabase link --project-ref YOUR_STAGING_PROJECT_REF
npx supabase migration list
npx supabase db push --dry-run
npx supabase db push
npx supabase gen types typescript \
  --project-id YOUR_STAGING_PROJECT_REF \
  --schema public \
  > lib/supabase/database.types.ts
```

The public VimmoAI deployment currently resolves to Supabase project
`mwxpkheuhmifjbleocwk`. The target guard rejects this known production ref.
Passing the guard is necessary but not sufficient: confirm the staging project
name in the Supabase Dashboard before running `link` or `db push`.

After the push, register the staging administrator and test the application
with two normal users before promoting the migration.

## Register an administrator

The API route still uses `VIMMOAI_ADMIN_USER_ID` as an application-level
check. The same Supabase Auth user must also be added to the database allowlist
with a service-role-only operation or through the SQL editor:

```sql
insert into public.vimmoai_admins (user_id)
values ('00000000-0000-0000-0000-000000000000')
on conflict (user_id) do nothing;
```

Do not grant browser roles direct access to `public.vimmoai_admins`.

## Regenerate TypeScript types

After every schema migration, regenerate the checked-in type snapshot from the
linked Supabase project:

```bash
npx supabase gen types typescript \
  --project-id YOUR_PROJECT_REF \
  --schema public \
  > lib/supabase/database.types.ts
```

Then run:

```bash
npm run lint
npm run build
```

## Required security checks

- A user can insert and read only their own orders.
- A user cannot update or delete an order directly.
- Upload paths must follow `USER_ID/ORDER_ID/FILENAME`.
- Only the registered administrator can call analysis RPCs.
- A user cannot read another user's original image.
- A generated video becomes readable by its owner only after it is recorded as
  `approved_video_path` and the order status is `approved` or `delivered`.
