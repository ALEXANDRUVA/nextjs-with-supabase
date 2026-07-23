begin;

create or replace function public.get_video_generation_dry_run(
  p_generation_id uuid
)
returns table (
  generation_id uuid,
  order_id uuid,
  attempt_number smallint,
  generation_status text,
  provider_key text,
  provider_request_id uuid,
  estimated_cost_cents integer,

  order_status text,
  original_image_path text,
  kling_prompt text,
  negative_prompt text,
  duration_seconds integer,
  recommended_settings jsonb,

  provider_display_name text,
  provider_enabled boolean,
  provider_priority smallint,
  provider_default_model text,
  provider_configuration jsonb,
  provider_supports_image_to_video boolean
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_vimmoai_admin() then
    raise exception 'Administrator access required'
      using errcode = '42501';
  end if;

  if p_generation_id is null then
    raise exception 'Generation ID is required'
      using errcode = '22023';
  end if;

  return query
  select
    generations.id,
    generations.order_id,
    generations.attempt_number,
    generations.status,
    generations.provider,
    generations.provider_request_id,
    generations.estimated_cost_cents,

    orders.status,
    orders.original_image_path,
    orders.kling_prompt,
    orders.negative_prompt,
    orders.duration_seconds,
    orders.recommended_settings,

    providers.display_name,
    providers.enabled,
    providers.priority,
    providers.default_model,
    providers.configuration,
    providers.supports_image_to_video

  from public.video_generations as generations

  join public.orders as orders
    on orders.id = generations.order_id

  join public.video_providers as providers
    on providers.provider_key =
      generations.provider

  where generations.id = p_generation_id;

  if not found then
    raise exception 'Video generation not found'
      using errcode = 'P0002';
  end if;
end;
$$;

revoke all
  on function public.get_video_generation_dry_run(uuid)
  from public, anon, authenticated;

grant execute
  on function public.get_video_generation_dry_run(uuid)
  to authenticated;

comment on function
  public.get_video_generation_dry_run(uuid)
is
  'Returns the non-mutating preparation data for an administrator video-generation dry run. It does not claim the job or contact the provider.';

commit;
