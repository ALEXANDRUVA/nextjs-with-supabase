begin;

create extension if not exists pgtap with schema extensions;

set local search_path = extensions, public;

select extensions.plan(46);

select has_table(
  'public',
  'orders',
  'orders table exists'
);

select has_table(
  'public',
  'vimmoai_admins',
  'administrator allowlist exists'
);

select ok(
  (
    select relrowsecurity
    from pg_class
    where oid = 'public.orders'::regclass
  ),
  'orders has RLS enabled'
);

select ok(
  (
    select relrowsecurity
    from pg_class
    where oid = 'public.vimmoai_admins'::regclass
  ),
  'administrator allowlist has RLS enabled'
);

select ok(
  exists (
    select 1
    from pg_constraint
    where conrelid = 'public.orders'::regclass
      and conname = 'orders_status_check'
  ),
  'order statuses are constrained'
);

select ok(
  to_regprocedure('public.delete_draft_order(uuid)') is not null,
  'delete_draft_order RPC exists'
);

select ok(
  to_regprocedure('public.complete_order_upload(uuid,text)') is not null,
  'complete_order_upload RPC exists'
);

select ok(
  to_regprocedure('public.claim_order_analysis(uuid)') is not null,
  'claim_order_analysis RPC exists'
);

select ok(
  to_regprocedure(
    'public.complete_order_analysis(uuid,jsonb,text,text,jsonb,text)'
  ) is not null,
  'complete_order_analysis RPC exists'
);

select ok(
  to_regprocedure('public.fail_order_analysis(uuid,text)') is not null,
  'fail_order_analysis RPC exists'
);

select ok(
  has_table_privilege('authenticated', 'public.orders', 'SELECT'),
  'authenticated users can select orders through RLS'
);

select ok(
  has_table_privilege('authenticated', 'public.orders', 'INSERT'),
  'authenticated users can insert orders through RLS'
);

select ok(
  not has_table_privilege('authenticated', 'public.orders', 'UPDATE'),
  'authenticated users cannot update orders directly'
);

select ok(
  not has_table_privilege('authenticated', 'public.orders', 'DELETE'),
  'authenticated users cannot delete orders directly'
);

select ok(
  not has_table_privilege('anon', 'public.orders', 'SELECT'),
  'anonymous users cannot select orders'
);

select ok(
  not has_function_privilege(
    'anon',
    'public.delete_draft_order(uuid)',
    'EXECUTE'
  ),
  'anonymous users cannot call delete_draft_order'
);

select ok(
  not has_function_privilege(
    'anon',
    'public.complete_order_upload(uuid,text)',
    'EXECUTE'
  ),
  'anonymous users cannot call complete_order_upload'
);

select ok(
  not has_function_privilege(
    'anon',
    'public.claim_order_analysis(uuid)',
    'EXECUTE'
  ),
  'anonymous users cannot call claim_order_analysis'
);

select ok(
  not has_function_privilege(
    'anon',
    'public.complete_order_analysis(uuid,jsonb,text,text,jsonb,text)',
    'EXECUTE'
  ),
  'anonymous users cannot call complete_order_analysis'
);

select ok(
  not has_function_privilege(
    'anon',
    'public.fail_order_analysis(uuid,text)',
    'EXECUTE'
  ),
  'anonymous users cannot call fail_order_analysis'
);

select set_eq(
  $$
    select policyname::text
    from pg_policies
    where schemaname = 'public'
      and tablename = 'orders'
  $$,
  $$
    values
      ('orders_insert_own_draft'::text),
      ('orders_select_own_or_admin'::text)
  $$,
  'orders exposes only the versioned policies'
);

select set_eq(
  $$
    select policyname::text
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname like 'original_images_%'
  $$,
  $$
    values
      ('original_images_delete_own_draft_or_admin'::text),
      ('original_images_insert_own_draft'::text),
      ('original_images_select_own_or_admin'::text)
  $$,
  'original image policies are installed'
);

select set_eq(
  $$
    select policyname::text
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname like 'generated_videos_%'
  $$,
  $$
    values
      ('generated_videos_delete_admin'::text),
      ('generated_videos_insert_admin'::text),
      ('generated_videos_select_approved_or_admin'::text),
      ('generated_videos_update_admin'::text)
  $$,
  'generated video policies are installed'
);

set local role service_role;

select ok(
  exists (
    select 1
    from storage.buckets as buckets
    where buckets.id = 'original-images'
      and buckets.public is false
      and buckets.file_size_limit = 20971520
      and buckets.allowed_mime_types @>
        array['image/jpeg', 'image/png', 'image/webp']::text[]
      and cardinality(buckets.allowed_mime_types) = 3
  ),
  'original image bucket is private and constrained'
);

select ok(
  exists (
    select 1
    from storage.buckets as buckets
    where buckets.id = 'generated-videos'
      and buckets.public is false
      and buckets.file_size_limit = 524288000
      and buckets.allowed_mime_types @>
        array['video/mp4', 'video/webm']::text[]
      and cardinality(buckets.allowed_mime_types) = 2
  ),
  'generated video bucket is private and constrained'
);

reset role;

select ok(
  exists (
    select 1
    from pg_constraint as constraints
    where conrelid = 'public.orders'::regclass
      and confrelid = (
        select relations.oid
        from pg_class as relations
        join pg_namespace as namespaces
          on namespaces.oid = relations.relnamespace
        where namespaces.nspname = 'auth'
          and relations.relname = 'users'
      )
      and contype = 'f'
  ),
  'orders user_id references auth.users'
);

select ok(
  exists (
    select 1
    from pg_constraint as constraints
    where conrelid = 'public.vimmoai_admins'::regclass
      and confrelid = (
        select relations.oid
        from pg_class as relations
        join pg_namespace as namespaces
          on namespaces.oid = relations.relnamespace
        where namespaces.nspname = 'auth'
          and relations.relname = 'users'
      )
      and contype = 'f'
  ),
  'administrator user_id references auth.users'
);

insert into auth.users (id, email, raw_user_meta_data)
values
  (
    '11111111-1111-4111-8111-111111111111',
    'vimmoai-user-one@example.test',
    '{}'::jsonb
  ),
  (
    '22222222-2222-4222-8222-222222222222',
    'vimmoai-user-two@example.test',
    '{}'::jsonb
  )
on conflict (id) do nothing;

insert into public.orders (
  id,
  user_id,
  status,
  property_type,
  room_type,
  style,
  duration_seconds,
  camera_motion,
  usage_type,
  image_rights_confirmed_at
)
values (
  'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  '22222222-2222-4222-8222-222222222222',
  'draft',
  'haus',
  'wohnzimmer',
  'modern',
  5,
  'slow_pan',
  'website',
  now()
);

set local role authenticated;
set local request.jwt.claim.sub = '11111111-1111-4111-8111-111111111111';
set local request.jwt.claim.role = 'authenticated';

select lives_ok(
  $$
    insert into public.orders (
      id,
      user_id,
      property_type,
      room_type,
      style,
      duration_seconds,
      camera_motion,
      usage_type,
      image_rights_confirmed_at
    )
    values (
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      '11111111-1111-4111-8111-111111111111',
      'wohnung',
      'schlafzimmer',
      'warm_minimalism',
      10,
      'slow_dolly_in',
      'immobilienportal',
      now()
    )
  $$,
  'a user can create their own valid draft order'
);

select results_eq(
  $$select count(*) from public.orders$$,
  array[1::bigint],
  'a regular user sees only their own orders'
);

select throws_ok(
  $$
    insert into public.orders (
      id,
      user_id,
      image_rights_confirmed_at
    )
    values (
      'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
      '22222222-2222-4222-8222-222222222222',
      now()
    )
  $$,
  '42501',
  'new row violates row-level security policy for table "orders"',
  'a user cannot create an order for another user'
);

select throws_ok(
  $$
    update public.orders
    set status = 'approved'
    where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
  $$,
  '42501',
  'permission denied for table orders',
  'a user cannot update an order directly'
);

set local request.jwt.claim.sub = '22222222-2222-4222-8222-222222222222';

select results_eq(
  $$select count(*) from public.orders$$,
  array[1::bigint],
  'the second user sees only their own orders'
);

select throws_ok(
  $$
    select *
    from public.claim_order_analysis(
      'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
    )
  $$,
  '42501',
  'Administrator access required',
  'a regular user cannot claim an order for analysis'
);

set local request.jwt.claim.sub = '11111111-1111-4111-8111-111111111111';

select lives_ok(
  $$
    insert into storage.objects (bucket_id, name)
    values (
      'original-images',
      '11111111-1111-4111-8111-111111111111/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/room.jpg'
    )
  $$,
  'an owner can upload an original image to their draft path'
);

select lives_ok(
  $$
    select public.complete_order_upload(
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      '11111111-1111-4111-8111-111111111111/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/room.jpg'
    )
  $$,
  'the owner can finalize an uploaded original image'
);

select results_eq(
  $$
    select status, original_image_path
    from public.orders
    where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
  $$,
  $$
    values (
      'image_uploaded'::text,
      '11111111-1111-4111-8111-111111111111/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/room.jpg'::text
    )
  $$,
  'finalizing an upload records its path and status'
);

select throws_ok(
  $$
    delete from storage.objects
    where bucket_id = 'original-images'
      and name = '11111111-1111-4111-8111-111111111111/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/room.jpg'
    returning name
  $$,
  '42501',
  'Direct deletion from storage tables is not allowed. Use the Storage API instead.',
  'the owner cannot delete an original after finalization'
);

select results_eq(
  $$
    select count(*)
    from storage.objects
    where bucket_id = 'original-images'
      and name = '11111111-1111-4111-8111-111111111111/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/room.jpg'
  $$,
  array[1::bigint],
  'the finalized original remains available to its owner'
);

reset role;

insert into public.vimmoai_admins (user_id)
values ('11111111-1111-4111-8111-111111111111');

set local role authenticated;
set local request.jwt.claim.sub = '11111111-1111-4111-8111-111111111111';
set local request.jwt.claim.role = 'authenticated';

select ok(
  public.is_vimmoai_admin(),
  'the allowlisted user is recognized as an administrator'
);

select results_eq(
  $$select count(*) from public.orders$$,
  array[2::bigint],
  'an administrator can see all orders'
);

select results_eq(
  $$
    select id
    from public.claim_order_analysis(
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
    )
  $$,
  $$values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid)$$,
  'an administrator can claim an uploaded order for analysis'
);

select lives_ok(
  $$
    select public.complete_order_analysis(
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      '{"room":"bedroom"}'::jsonb,
      'A slow, stable real-estate camera move.',
      'No geometry distortion.',
      '{"duration_seconds":10}'::jsonb,
      'test-model'
    )
  $$,
  'an administrator can complete an active analysis'
);

select results_eq(
  $$
    select status
    from public.orders
    where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
  $$,
  array['prompt_ready'::text],
  'completing analysis advances the order to prompt_ready'
);

select lives_ok(
  $$
    insert into storage.objects (bucket_id, name)
    values (
      'generated-videos',
      '22222222-2222-4222-8222-222222222222/bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb/final.mp4'
    )
  $$,
  'an administrator can upload a generated video for an existing order'
);

set local request.jwt.claim.sub = '22222222-2222-4222-8222-222222222222';

select results_eq(
  $$
    select count(*)
    from storage.objects
    where bucket_id = 'generated-videos'
  $$,
  array[0::bigint],
  'an owner cannot read an unapproved generated video'
);

reset role;

update public.orders
set
  status = 'approved',
  approved_video_path =
    '22222222-2222-4222-8222-222222222222/bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb/final.mp4'
where id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

set local role authenticated;
set local request.jwt.claim.sub = '22222222-2222-4222-8222-222222222222';
set local request.jwt.claim.role = 'authenticated';

select results_eq(
  $$
    select count(*)
    from storage.objects
    where bucket_id = 'generated-videos'
  $$,
  array[1::bigint],
  'an owner can read their approved generated video'
);

select * from extensions.finish();

rollback;
