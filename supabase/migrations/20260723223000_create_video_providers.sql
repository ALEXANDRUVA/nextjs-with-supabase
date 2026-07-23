begin;

create table if not exists public.video_providers (
  id uuid primary key default gen_random_uuid(),

  provider_key text not null,
  display_name text not null,

  enabled boolean not null default false,
  priority smallint not null default 100,

  supports_image_to_video boolean not null default true,
  supports_text_to_video boolean not null default false,

  default_model text,
  configuration jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint video_providers_provider_key_unique
    unique (provider_key),

  constraint video_providers_provider_key_check
    check (
      provider_key ~ '^[a-z0-9][a-z0-9_-]{1,49}$'
    ),

  constraint video_providers_display_name_check
    check (
      nullif(btrim(display_name), '') is not null
      and char_length(display_name) <= 100
    ),

  constraint video_providers_priority_check
    check (
      priority between 1 and 1000
    ),

  constraint video_providers_default_model_check
    check (
      default_model is null
      or (
        nullif(btrim(default_model), '') is not null
        and char_length(default_model) <= 100
      )
    )
);

create unique index if not exists
  video_providers_priority_unique_when_enabled
on public.video_providers(priority)
where enabled = true;

create index if not exists
  video_providers_enabled_priority_idx
on public.video_providers(enabled, priority);

drop trigger if exists
  set_vimmoai_video_providers_updated_at
on public.video_providers;

create trigger
  set_vimmoai_video_providers_updated_at
before update on public.video_providers
for each row
execute function public.set_vimmoai_updated_at();

alter table public.video_providers
  enable row level security;

revoke all
  on public.video_providers
  from anon, authenticated;

insert into public.video_providers (
  provider_key,
  display_name,
  enabled,
  priority,
  supports_image_to_video,
  supports_text_to_video,
  default_model,
  configuration
)
values (
  'kling',
  'Kling AI',
  true,
  1,
  true,
  false,
  null,
  jsonb_build_object(
    'generation_mode', 'standard',
    'status', 'beta'
  )
)
on conflict (provider_key)
do update set
  display_name = excluded.display_name,
  supports_image_to_video =
    excluded.supports_image_to_video,
  supports_text_to_video =
    excluded.supports_text_to_video,
  updated_at = now();

comment on table public.video_providers is
  'Server-managed registry of AI video providers available to VimmoAI.';

comment on column public.video_providers.configuration is
  'Non-secret provider settings. API keys must remain in server environment variables.';

commit;
