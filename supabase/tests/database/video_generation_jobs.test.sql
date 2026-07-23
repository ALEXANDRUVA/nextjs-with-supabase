begin;

create extension if not exists pgtap with schema extensions;

set local search_path = extensions, public;

select extensions.plan(38);

select has_table(
  'public',
  'video_generations',
  'video generation jobs table exists'
);

select ok(
  (
    select relrowsecurity
    from pg_class
    where oid = 'public.video_generations'::regclass
  ),
  'video generation jobs have RLS enabled'
);

select ok(
  exists (
    select 1
    from pg_constraint
    where conrelid = 'public.video_generations'::regclass
      and conname = 'video_generations_attempt_check'
  ),
  'generation attempts are constrained'
);

select ok(
  exists (
    select 1
    from pg_constraint
    where conrelid = 'public.video_generations'::regclass
      and conname = 'video_generations_status_check'
  ),
  'generation statuses are constrained'
);

select ok(
  exists (
    select 1
    from pg_constraint
    where conrelid = 'public.video_generations'::regclass
      and conname = 'video_generations_cost_check'
  ),
  'generation costs are constrained'
);

select ok(
  to_regclass('public.video_generations_one_active_per_order_idx')
    is not null,
  'one-active-generation index exists'
);

select ok(
  to_regprocedure('public.queue_video_generation(uuid,uuid,integer)')
    is not null,
  'queue_video_generation RPC exists'
);

select ok(
  to_regprocedure('public.claim_video_generation(uuid)') is not null,
  'claim_video_generation RPC exists'
);

select ok(
  to_regprocedure(
    'public.complete_video_generation(uuid,text,text,integer)'
  ) is not null,
  'complete_video_generation RPC exists'
);

select ok(
  to_regprocedure(
    'public.fail_video_generation(uuid,text,text,text,integer)'
  ) is not null,
  'fail_video_generation RPC exists'
);

select ok(
  not has_table_privilege(
    'authenticated',
    'public.video_generations',
    'SELECT'
  ),
  'authenticated users cannot select generation jobs directly'
);

select ok(
  not has_table_privilege(
    'authenticated',
    'public.video_generations',
    'INSERT'
  ),
  'authenticated users cannot insert generation jobs directly'
);

select ok(
  not has_function_privilege(
    'anon',
    'public.queue_video_generation(uuid,uuid,integer)',
    'EXECUTE'
  ),
  'anonymous users cannot queue generation jobs'
);

select ok(
  has_function_privilege(
    'authenticated',
    'public.queue_video_generation(uuid,uuid,integer)',
    'EXECUTE'
  ),
  'authenticated administrators can call the queue RPC'
);

select ok(
  not has_function_privilege(
    'anon',
    'public.claim_video_generation(uuid)',
    'EXECUTE'
  ),
  'anonymous users cannot claim generation jobs'
);

select ok(
  has_function_privilege(
    'authenticated',
    'public.claim_video_generation(uuid)',
    'EXECUTE'
  ),
  'authenticated administrators can call the claim RPC'
);

select set_eq(
  $$
    select policyname::text
    from pg_policies
    where schemaname = 'public'
      and tablename = 'video_generations'
  $$,
  $$select null::text where false$$,
  'generation jobs have no direct browser policies'
);

insert into auth.users (id, email, raw_user_meta_data)
values
  (
    '11111111-1111-4111-8111-111111111111',
    'video-admin@example.test',
    '{}'::jsonb
  ),
  (
    '22222222-2222-4222-8222-222222222222',
    'video-user@example.test',
    '{}'::jsonb
  );

insert into public.orders (id, user_id, status, kling_prompt)
values
  (
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    '22222222-2222-4222-8222-222222222222',
    'prompt_ready',
    'A stable real-estate camera movement.'
  ),
  (
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    '22222222-2222-4222-8222-222222222222',
    'prompt_ready',
    'A stable real-estate camera movement.'
  ),
  (
    'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
    '22222222-2222-4222-8222-222222222222',
    'prompt_ready',
    'A stable real-estate camera movement.'
  ),
  (
    'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
    '22222222-2222-4222-8222-222222222222',
    'prompt_ready',
    'A stable real-estate camera movement.'
  ),
  (
    'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
    '22222222-2222-4222-8222-222222222222',
    'prompt_ready',
    'A stable real-estate camera movement.'
  ),
  (
    'ffffffff-ffff-4fff-8fff-ffffffffffff',
    '22222222-2222-4222-8222-222222222222',
    'prompt_ready',
    'A stable real-estate camera movement.'
  ),
  (
    '99999999-9999-4999-8999-999999999999',
    '22222222-2222-4222-8222-222222222222',
    'prompt_ready',
    'A stable real-estate camera movement.'
  );

set local role authenticated;
set local request.jwt.claim.sub = '22222222-2222-4222-8222-222222222222';
set local request.jwt.claim.role = 'authenticated';

select throws_ok(
  $$
    select *
    from public.queue_video_generation(
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      '10000000-0000-4000-8000-000000000001',
      100
    )
  $$,
  '42501',
  'Administrator access required',
  'a regular user cannot queue a generation job'
);

reset role;

insert into public.vimmoai_admins (user_id)
values ('11111111-1111-4111-8111-111111111111');

set local role authenticated;
set local request.jwt.claim.sub = '11111111-1111-4111-8111-111111111111';
set local request.jwt.claim.role = 'authenticated';

select results_eq(
  $$
    select attempt_number, status, estimated_cost_cents
    from public.queue_video_generation(
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      '10000000-0000-4000-8000-000000000001',
      100
    )
  $$,
  $$values (1::smallint, 'queued'::text, 100::integer)$$,
  'an administrator can queue the first costed attempt'
);

select results_eq(
  $$
    select status
    from public.orders
    where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
  $$,
  array['video_queued'::text],
  'queueing advances the order to video_queued'
);

select lives_ok(
  $$
    select *
    from public.queue_video_generation(
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      '10000000-0000-4000-8000-000000000001',
      100
    )
  $$,
  'replaying the same idempotency key succeeds'
);

reset role;

select results_eq(
  $$
    select count(*)
    from public.video_generations
    where order_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
  $$,
  array[1::bigint],
  'an idempotent replay creates no second job'
);

set local role authenticated;

select lives_ok(
  $$
    select *
    from public.queue_video_generation(
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      '10000000-0000-4000-8000-000000000002',
      100
    )
  $$,
  'a second click reuses the active job'
);

reset role;

select results_eq(
  $$
    select count(*)
    from public.video_generations
    where order_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
  $$,
  array[1::bigint],
  'only one active job exists for an order'
);

do $test_state$
declare
  first_generation_id uuid;
begin
  select id
  into first_generation_id
  from public.video_generations
  where order_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

  perform set_config(
    'vimmoai.test_first_generation_id',
    first_generation_id::text,
    true
  );
end;
$test_state$;

set local role authenticated;

select lives_ok(
  $$
    select *
    from public.claim_video_generation(
      current_setting('vimmoai.test_first_generation_id')::uuid
    )
  $$,
  'an administrator can claim a queued job'
);

reset role;

select results_eq(
  $$
    select status
    from public.video_generations
    where order_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
  $$,
  array['processing'::text],
  'claiming advances the generation job to processing'
);

select results_eq(
  $$
    select status
    from public.orders
    where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
  $$,
  array['video_processing'::text],
  'claiming advances the order to video_processing'
);

set local role authenticated;

select lives_ok(
  $$
    select public.fail_video_generation(
      current_setting('vimmoai.test_first_generation_id')::uuid,
      'provider-task-one',
      'TEST_FAILURE',
      'Simulated provider failure.',
      100
    )
  $$,
  'an administrator can record a provider failure'
);

reset role;

select results_eq(
  $$
    select generations.status, orders.status
    from public.video_generations as generations
    join public.orders as orders on orders.id = generations.order_id
    where generations.order_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
  $$,
  $$values ('failed'::text, 'failed'::text)$$,
  'a provider failure advances both job and order to failed'
);

set local role authenticated;

select lives_ok(
  $$
    select *
    from public.queue_video_generation(
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      '10000000-0000-4000-8000-000000000003',
      100
    )
  $$,
  'an administrator can queue the second and final attempt'
);

reset role;

select results_eq(
  $$
    select attempt_number
    from public.video_generations
    where order_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
    order by attempt_number
  $$,
  $$values (1::smallint), (2::smallint)$$,
  'attempt numbers are sequential and capped at two'
);

do $test_state$
declare
  second_generation_id uuid;
begin
  select id
  into second_generation_id
  from public.video_generations
  where order_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
    and attempt_number = 2;

  perform set_config(
    'vimmoai.test_second_generation_id',
    second_generation_id::text,
    true
  );
end;
$test_state$;

set local role authenticated;

select lives_ok(
  $$
    select *
    from public.claim_video_generation(
      current_setting('vimmoai.test_second_generation_id')::uuid
    )
  $$,
  'the second attempt can be claimed'
);

select lives_ok(
  $$
    select public.fail_video_generation(
      current_setting('vimmoai.test_second_generation_id')::uuid,
      'provider-task-two',
      'TEST_FAILURE',
      'Second simulated provider failure.',
      100
    )
  $$,
  'the second attempt can fail without creating a third'
);

select throws_ok(
  $$
    select *
    from public.queue_video_generation(
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      '10000000-0000-4000-8000-000000000004',
      100
    )
  $$,
  'P0001',
  'Generation attempt limit reached',
  'a third generation attempt is rejected'
);

select throws_ok(
  $$
    select *
    from public.queue_video_generation(
      'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
      '20000000-0000-4000-8000-000000000001',
      0
    )
  $$,
  '22023',
  'Estimated cost must be between 1 and 3000 cents',
  'a zero-cost production job is rejected'
);

select throws_ok(
  $$
    select *
    from public.queue_video_generation(
      'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
      '20000000-0000-4000-8000-000000000002',
      3001
    )
  $$,
  '22023',
  'Estimated cost must be between 1 and 3000 cents',
  'a single job above the daily ceiling is rejected'
);

reset role;

insert into public.video_generations (
  order_id,
  requested_by,
  attempt_number,
  status,
  idempotency_key,
  estimated_cost_cents,
  error_message,
  finished_at
)
values (
  'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
  '11111111-1111-4111-8111-111111111111',
  1,
  'failed',
  '30000000-0000-4000-8000-000000000001',
  2800,
  'Budget fixture.',
  now()
);

set local role authenticated;
set local request.jwt.claim.sub = '11111111-1111-4111-8111-111111111111';
set local request.jwt.claim.role = 'authenticated';

select throws_ok(
  $$
    select *
    from public.queue_video_generation(
      'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
      '30000000-0000-4000-8000-000000000002',
      1
    )
  $$,
  'P0001',
  'Daily video generation budget reached',
  'the thirty-euro daily budget is enforced'
);

reset role;

update public.video_generations
set created_at = case
  when extract(day from now()) > 1
    then date_trunc('day', now()) - interval '1 day'
  else now()
end;

insert into public.video_generations (
  order_id,
  requested_by,
  attempt_number,
  status,
  idempotency_key,
  estimated_cost_cents,
  error_message,
  finished_at,
  created_at
)
values
  (
    'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
    '11111111-1111-4111-8111-111111111111',
    1,
    'failed',
    '40000000-0000-4000-8000-000000000001',
    3000,
    'Monthly budget fixture.',
    now(),
    case
      when extract(day from now()) > 1
        then date_trunc('day', now()) - interval '1 day'
      else now()
    end
  ),
  (
    'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
    '11111111-1111-4111-8111-111111111111',
    1,
    'failed',
    '40000000-0000-4000-8000-000000000002',
    3000,
    'Monthly budget fixture.',
    now(),
    case
      when extract(day from now()) > 1
        then date_trunc('day', now()) - interval '1 day'
      else now()
    end
  ),
  (
    'ffffffff-ffff-4fff-8fff-ffffffffffff',
    '11111111-1111-4111-8111-111111111111',
    1,
    'failed',
    '40000000-0000-4000-8000-000000000003',
    3000,
    'Monthly budget fixture.',
    now(),
    case
      when extract(day from now()) > 1
        then date_trunc('day', now()) - interval '1 day'
      else now()
    end
  ),
  (
    '99999999-9999-4999-8999-999999999999',
    '11111111-1111-4111-8111-111111111111',
    1,
    'failed',
    '40000000-0000-4000-8000-000000000004',
    3000,
    'Monthly budget fixture.',
    now(),
    case
      when extract(day from now()) > 1
        then date_trunc('day', now()) - interval '1 day'
      else now()
    end
  );

set local role authenticated;
set local request.jwt.claim.sub = '11111111-1111-4111-8111-111111111111';
set local request.jwt.claim.role = 'authenticated';

select throws_ok(
  $$
    select *
    from public.queue_video_generation(
      'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
      '50000000-0000-4000-8000-000000000001',
      1
    )
  $$,
  'P0001',
  case
    when extract(day from now()) > 1
      then 'Monthly video generation budget reached'
    else 'Daily video generation budget reached'
  end,
  'the monthly ceiling blocks new spending (the daily ceiling wins on day one)'
);

select * from extensions.finish();

rollback;
