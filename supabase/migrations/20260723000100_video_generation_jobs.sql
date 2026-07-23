begin;

/*
 * Points 10, 12 and 19: durable video jobs, idempotency and financial safety.
 *
 * This migration does not call Kling (or any other provider). It only creates
 * the state machine that a later provider integration must use.
 */
create table public.video_generations (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  requested_by uuid not null references auth.users (id) on delete restrict,
  attempt_number smallint not null,
  status text not null default 'queued',
  idempotency_key uuid not null,
  provider text not null default 'kling',
  provider_request_id uuid not null default gen_random_uuid(),
  provider_task_id text,
  estimated_cost_cents integer not null default 0,
  actual_cost_cents integer not null default 0,
  currency text not null default 'EUR',
  error_code text,
  error_message text,
  result_video_path text,
  queued_at timestamptz not null default now(),
  started_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint video_generations_attempt_check check (
    attempt_number between 1 and 2
  ),
  constraint video_generations_status_check check (
    status in ('queued', 'processing', 'completed', 'failed')
  ),
  constraint video_generations_provider_check check (
    nullif(btrim(provider), '') is not null
    and char_length(provider) <= 50
  ),
  constraint video_generations_provider_task_id_check check (
    provider_task_id is null
    or (
      nullif(btrim(provider_task_id), '') is not null
      and char_length(provider_task_id) <= 500
    )
  ),
  constraint video_generations_cost_check check (
    estimated_cost_cents >= 0
    and actual_cost_cents >= 0
    and estimated_cost_cents <= 3000
    and actual_cost_cents <= 3000
  ),
  constraint video_generations_currency_check check (
    currency ~ '^[A-Z]{3}$'
  ),
  constraint video_generations_error_check check (
    (error_code is null or char_length(error_code) <= 100)
    and (error_message is null or char_length(error_message) <= 2000)
  ),
  constraint video_generations_lifecycle_check check (
    (
      status = 'queued'
      and started_at is null
      and finished_at is null
      and error_code is null
      and error_message is null
      and result_video_path is null
    )
    or (
      status = 'processing'
      and started_at is not null
      and finished_at is null
      and error_code is null
      and error_message is null
      and result_video_path is null
    )
    or (
      status = 'completed'
      and started_at is not null
      and finished_at is not null
      and error_code is null
      and error_message is null
      and result_video_path is not null
    )
    or (
      status = 'failed'
      and finished_at is not null
      and error_message is not null
      and result_video_path is null
    )
  ),
  constraint video_generations_order_attempt_unique unique (
    order_id,
    attempt_number
  ),
  constraint video_generations_idempotency_key_unique unique (
    idempotency_key
  ),
  constraint video_generations_provider_request_id_unique unique (
    provider_request_id
  )
);

/*
 * This partial unique index is the database-level final defence against two
 * workers creating billable jobs for the same order at the same time.
 */
create unique index video_generations_one_active_per_order_idx
  on public.video_generations (order_id)
  where status in ('queued', 'processing');

create unique index video_generations_provider_task_id_idx
  on public.video_generations (provider_task_id)
  where provider_task_id is not null;

create index video_generations_order_created_at_idx
  on public.video_generations (order_id, created_at desc);

create index video_generations_status_queued_at_idx
  on public.video_generations (status, queued_at asc);

drop trigger if exists set_vimmoai_video_generations_updated_at
  on public.video_generations;

create trigger set_vimmoai_video_generations_updated_at
before update on public.video_generations
for each row
execute function public.set_vimmoai_updated_at();

create or replace function public.queue_video_generation(
  p_order_id uuid,
  p_idempotency_key uuid,
  p_estimated_cost_cents integer
)
returns table (
  generation_id uuid,
  order_id uuid,
  attempt_number smallint,
  status text,
  provider_request_id uuid,
  estimated_cost_cents integer,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  locked_order public.orders%rowtype;
  generation public.video_generations%rowtype;
  previous_attempts integer;
  daily_committed_cents integer;
  monthly_committed_cents integer;
begin
  if not public.is_vimmoai_admin() then
    raise exception 'Administrator access required' using errcode = '42501';
  end if;

  if p_idempotency_key is null then
    raise exception 'Idempotency key is required' using errcode = '22023';
  end if;

  if p_estimated_cost_cents not between 1 and 3000 then
    raise exception 'Estimated cost must be between 1 and 3000 cents'
      using errcode = '22023';
  end if;

  /* Serialise every queue decision for the same order. */
  select orders.*
  into locked_order
  from public.orders as orders
  where orders.id = p_order_id
  for update;

  if not found then
    raise exception 'Order not found' using errcode = 'P0002';
  end if;

  /* Replaying the same request always returns the original job. */
  select generations.*
  into generation
  from public.video_generations as generations
  where generations.idempotency_key = p_idempotency_key;

  if found then
    if generation.order_id <> p_order_id then
      raise exception 'Idempotency key belongs to another order'
        using errcode = '22023';
    end if;

    return query
    select
      generation.id,
      generation.order_id,
      generation.attempt_number,
      generation.status,
      generation.provider_request_id,
      generation.estimated_cost_cents,
      generation.created_at;
    return;
  end if;

  /* A different double-click still reuses the active job. */
  select generations.*
  into generation
  from public.video_generations as generations
  where generations.order_id = p_order_id
    and generations.status in ('queued', 'processing')
  order by generations.created_at desc
  limit 1;

  if found then
    return query
    select
      generation.id,
      generation.order_id,
      generation.attempt_number,
      generation.status,
      generation.provider_request_id,
      generation.estimated_cost_cents,
      generation.created_at;
    return;
  end if;

  if locked_order.status not in ('prompt_ready', 'failed')
    or nullif(btrim(locked_order.kling_prompt), '') is null
  then
    raise exception 'Order is not ready for video generation'
      using errcode = 'P0001';
  end if;

  select count(*)
  into previous_attempts
  from public.video_generations as generations
  where generations.order_id = p_order_id;

  if previous_attempts >= 2 then
    raise exception 'Generation attempt limit reached'
      using errcode = 'P0001';
  end if;

  /*
   * Serialise the global budget decision across different orders. The
   * committed amount is the higher of estimated and actual cost so a failed
   * or unexpectedly expensive provider call still counts against the limit.
   */
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('vimmoai-video-cost-budget', 0)
  );

  select coalesce(
    sum(greatest(
      generations.estimated_cost_cents,
      generations.actual_cost_cents
    )),
    0
  )::integer
  into daily_committed_cents
  from public.video_generations as generations
  where generations.created_at >= (
    pg_catalog.date_trunc(
      'day',
      pg_catalog.timezone('UTC', pg_catalog.now())
    ) at time zone 'UTC'
  )
    and generations.created_at <= pg_catalog.now();

  if daily_committed_cents + p_estimated_cost_cents > 3000 then
    raise exception 'Daily video generation budget reached'
      using errcode = 'P0001';
  end if;

  select coalesce(
    sum(greatest(
      generations.estimated_cost_cents,
      generations.actual_cost_cents
    )),
    0
  )::integer
  into monthly_committed_cents
  from public.video_generations as generations
  where generations.created_at >= (
    pg_catalog.date_trunc(
      'month',
      pg_catalog.timezone('UTC', pg_catalog.now())
    ) at time zone 'UTC'
  )
    and generations.created_at <= pg_catalog.now();

  if monthly_committed_cents + p_estimated_cost_cents > 15000 then
    raise exception 'Monthly video generation budget reached'
      using errcode = 'P0001';
  end if;

  insert into public.video_generations (
    order_id,
    requested_by,
    attempt_number,
    idempotency_key,
    estimated_cost_cents
  )
  values (
    p_order_id,
    auth.uid(),
    (previous_attempts + 1)::smallint,
    p_idempotency_key,
    p_estimated_cost_cents
  )
  returning * into generation;

  update public.orders as orders
  set status = 'video_queued'
  where orders.id = p_order_id;

  return query
  select
    generation.id,
    generation.order_id,
    generation.attempt_number,
    generation.status,
    generation.provider_request_id,
    generation.estimated_cost_cents,
    generation.created_at;
end;
$$;

create or replace function public.claim_video_generation(
  p_generation_id uuid
)
returns table (
  generation_id uuid,
  order_id uuid,
  attempt_number smallint,
  provider_request_id uuid,
  started_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  generation public.video_generations%rowtype;
begin
  if not public.is_vimmoai_admin() then
    raise exception 'Administrator access required' using errcode = '42501';
  end if;

  update public.video_generations as generations
  set
    status = 'processing',
    started_at = now()
  where generations.id = p_generation_id
    and generations.status = 'queued'
  returning * into generation;

  if not found then
    raise exception 'Queued video generation not found'
      using errcode = 'P0002';
  end if;

  update public.orders as orders
  set status = 'video_processing'
  where orders.id = generation.order_id;

  return query
  select
    generation.id,
    generation.order_id,
    generation.attempt_number,
    generation.provider_request_id,
    generation.started_at;
end;
$$;

create or replace function public.complete_video_generation(
  p_generation_id uuid,
  p_provider_task_id text,
  p_result_video_path text,
  p_actual_cost_cents integer
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  generation public.video_generations%rowtype;
  order_owner_id uuid;
begin
  if not public.is_vimmoai_admin() then
    raise exception 'Administrator access required' using errcode = '42501';
  end if;

  if nullif(btrim(p_provider_task_id), '') is null
    or char_length(p_provider_task_id) > 500
    or p_actual_cost_cents not between 0 and 3000
  then
    raise exception 'Invalid provider completion data' using errcode = '22023';
  end if;

  select generations.*, orders.user_id
  into generation, order_owner_id
  from public.video_generations as generations
  join public.orders as orders on orders.id = generations.order_id
  where generations.id = p_generation_id
    and generations.status = 'processing'
  for update of generations;

  if not found then
    raise exception 'Processing video generation not found'
      using errcode = 'P0002';
  end if;

  if p_result_video_path is null
    or split_part(p_result_video_path, '/', 1) <> order_owner_id::text
    or split_part(p_result_video_path, '/', 2) <> generation.order_id::text
    or lower(p_result_video_path) !~ '\.(mp4|webm)$'
  then
    raise exception 'Invalid generated video path' using errcode = '22023';
  end if;

  if not exists (
    select 1
    from storage.objects as objects
    where objects.bucket_id = 'generated-videos'
      and objects.name = p_result_video_path
  ) then
    raise exception 'Generated video was not uploaded' using errcode = 'P0002';
  end if;

  update public.video_generations as generations
  set
    status = 'completed',
    provider_task_id = p_provider_task_id,
    result_video_path = p_result_video_path,
    actual_cost_cents = p_actual_cost_cents,
    finished_at = now()
  where generations.id = p_generation_id;

  update public.orders as orders
  set status = 'quality_review'
  where orders.id = generation.order_id;

  return true;
end;
$$;

create or replace function public.fail_video_generation(
  p_generation_id uuid,
  p_provider_task_id text,
  p_error_code text,
  p_error_message text,
  p_actual_cost_cents integer
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  generation public.video_generations%rowtype;
begin
  if not public.is_vimmoai_admin() then
    raise exception 'Administrator access required' using errcode = '42501';
  end if;

  if nullif(btrim(p_error_message), '') is null
    or char_length(p_error_message) > 2000
    or (p_error_code is not null and char_length(p_error_code) > 100)
    or (p_provider_task_id is not null and char_length(p_provider_task_id) > 500)
    or p_actual_cost_cents not between 0 and 3000
  then
    raise exception 'Invalid provider failure data' using errcode = '22023';
  end if;

  update public.video_generations as generations
  set
    status = 'failed',
    provider_task_id = nullif(btrim(p_provider_task_id), ''),
    error_code = nullif(btrim(p_error_code), ''),
    error_message = btrim(p_error_message),
    actual_cost_cents = p_actual_cost_cents,
    finished_at = now()
  where generations.id = p_generation_id
    and generations.status in ('queued', 'processing')
  returning * into generation;

  if not found then
    raise exception 'Active video generation not found'
      using errcode = 'P0002';
  end if;

  update public.orders as orders
  set status = 'failed'
  where orders.id = generation.order_id;

  return true;
end;
$$;

revoke all on table public.video_generations from anon, authenticated;

revoke all on function public.queue_video_generation(uuid, uuid, integer)
  from public, anon, authenticated;
revoke all on function public.claim_video_generation(uuid)
  from public, anon, authenticated;
revoke all on function public.complete_video_generation(uuid, text, text, integer)
  from public, anon, authenticated;
revoke all on function public.fail_video_generation(uuid, text, text, text, integer)
  from public, anon, authenticated;

grant execute on function public.queue_video_generation(uuid, uuid, integer)
  to authenticated;
grant execute on function public.claim_video_generation(uuid)
  to authenticated;
grant execute on function public.complete_video_generation(uuid, text, text, integer)
  to authenticated;
grant execute on function public.fail_video_generation(uuid, text, text, text, integer)
  to authenticated;

alter table public.video_generations enable row level security;

comment on table public.video_generations is
  'At most two idempotent, auditable video generation attempts per order.';

comment on column public.video_generations.idempotency_key is
  'Caller-generated key used to replay a request without creating another billable job.';

comment on column public.video_generations.provider_request_id is
  'Stable identifier to send to the video provider for cross-system tracing.';

comment on index public.video_generations_one_active_per_order_idx is
  'Prevents multiple queued or processing jobs for the same order.';

commit;
