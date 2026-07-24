begin;

create or replace function public.record_video_generation_submission(
  p_generation_id uuid,
  p_provider_task_id text
)
returns table (
  generation_id uuid,
  order_id uuid,
  generation_status text,
  provider_key text,
  recorded_provider_task_id text,
  started_at timestamptz,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  generation public.video_generations%rowtype;
  normalized_provider_task_id text;
begin
  if not public.is_vimmoai_admin() then
    raise exception
      'Administrator access required'
      using errcode = '42501';
  end if;

  if p_generation_id is null then
    raise exception
      'Generation ID is required'
      using errcode = '22023';
  end if;

  normalized_provider_task_id :=
    nullif(
      pg_catalog.btrim(
        p_provider_task_id
      ),
      ''
    );

  if normalized_provider_task_id is null
    or pg_catalog.char_length(
      normalized_provider_task_id
    ) > 500
  then
    raise exception
      'Invalid provider task ID'
      using errcode = '22023';
  end if;

  select generations.*
  into generation
  from public.video_generations
    as generations
  where generations.id =
    p_generation_id
  for update;

  if not found then
    raise exception
      'Video generation not found'
      using errcode = 'P0002';
  end if;

  if generation.status <> 'processing' then
    raise exception
      'Video generation is not processing'
      using errcode = 'P0001';
  end if;

  /*
   * Replaying the same provider response is safe.
   * A different task ID may never overwrite the
   * original provider task.
   */
  if generation.provider_task_id is not null
    and generation.provider_task_id <>
      normalized_provider_task_id
  then
    raise exception
      'Provider task ID mismatch'
      using errcode = '22023';
  end if;

  if generation.provider_task_id is null then
    update public.video_generations
      as generations
    set provider_task_id =
      normalized_provider_task_id
    where generations.id =
      p_generation_id
    returning generations.*
    into generation;
  end if;

  return query
  select
    generation.id,
    generation.order_id,
    generation.status,
    generation.provider,
    generation.provider_task_id,
    generation.started_at,
    generation.updated_at;
end;
$$;

revoke all
  on function
    public.record_video_generation_submission(
      uuid,
      text
    )
  from public, anon, authenticated;

grant execute
  on function
    public.record_video_generation_submission(
      uuid,
      text
    )
  to authenticated;

comment on function
  public.record_video_generation_submission(
    uuid,
    text
  )
is
  'Idempotently records the external provider task ID for an administrator-controlled processing video generation.';

commit;
