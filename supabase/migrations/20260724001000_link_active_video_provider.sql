begin;

-- Remove the hard-coded Kling default.
-- The active provider will now be selected from video_providers.
alter table public.video_generations
  alter column provider drop default;

-- Ensure every generation references a registered provider.
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'video_generations_provider_fkey'
      and conrelid = 'public.video_generations'::regclass
  ) then
    alter table public.video_generations
      add constraint video_generations_provider_fkey
      foreign key (provider)
      references public.video_providers(provider_key)
      on update cascade
      on delete restrict;
  end if;
end;
$$;

-- Secure server-side function used by the Next.js selector.
create or replace function public.get_active_video_provider()
returns table (
  provider_key text,
  display_name text,
  priority smallint,
  default_model text,
  configuration jsonb
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

  return query
  select
    providers.provider_key,
    providers.display_name,
    providers.priority,
    providers.default_model,
    providers.configuration
  from public.video_providers as providers
  where providers.enabled = true
    and providers.supports_image_to_video = true
  order by
    providers.priority asc,
    providers.provider_key asc
  limit 1;

  if not found then
    raise exception
      'No active image-to-video provider is configured'
      using errcode = 'P0002';
  end if;
end;
$$;

-- Trigger function: every new queued job receives the currently
-- active provider automatically.
create or replace function public.assign_active_video_provider()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  selected_provider_key text;
begin
  select providers.provider_key
  into selected_provider_key
  from public.video_providers as providers
  where providers.enabled = true
    and providers.supports_image_to_video = true
  order by
    providers.priority asc,
    providers.provider_key asc
  limit 1;

  if not found then
    raise exception
      'No active image-to-video provider is configured'
      using errcode = 'P0002';
  end if;

  new.provider := selected_provider_key;

  return new;
end;
$$;

drop trigger if exists
  assign_active_provider_to_video_generation
on public.video_generations;

create trigger
  assign_active_provider_to_video_generation
before insert on public.video_generations
for each row
execute function public.assign_active_video_provider();

revoke all
  on function public.get_active_video_provider()
  from public, anon, authenticated;

grant execute
  on function public.get_active_video_provider()
  to authenticated;

revoke all
  on function public.assign_active_video_provider()
  from public, anon, authenticated;

comment on function public.get_active_video_provider() is
  'Returns the highest-priority enabled image-to-video provider to VimmoAI administrators.';

comment on function public.assign_active_video_provider() is
  'Database trigger that assigns the active video provider to every new video generation job.';

comment on constraint video_generations_provider_fkey
  on public.video_generations is
  'Ensures every video generation uses a provider registered in video_providers.';

commit;
