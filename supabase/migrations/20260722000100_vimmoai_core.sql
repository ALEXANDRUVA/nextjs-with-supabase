begin;

create extension if not exists pgcrypto with schema extensions;

/*
 * VimmoAI administrators are data, not deployment configuration.
 * Keep this table inaccessible to browser roles and manage it through the
 * Supabase SQL editor or another service-role-only administrative workflow.
 */
create table if not exists public.vimmoai_admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  status text not null default 'draft',
  property_type text,
  room_type text,
  style text,
  duration_seconds integer,
  camera_motion text,
  usage_type text,
  notes text,
  image_rights_confirmed_at timestamptz,
  original_image_path text,
  ai_analysis jsonb,
  kling_prompt text,
  negative_prompt text,
  recommended_settings jsonb,
  prompt_model text,
  analysis_error text,
  analysis_started_at timestamptz,
  analysis_completed_at timestamptz,
  approved_video_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

/*
 * These ALTER statements make the baseline safe to introduce into the
 * existing VimmoAI project where the orders table already exists.
 */
alter table public.orders
  add column if not exists status text not null default 'draft',
  add column if not exists property_type text,
  add column if not exists room_type text,
  add column if not exists style text,
  add column if not exists duration_seconds integer,
  add column if not exists camera_motion text,
  add column if not exists usage_type text,
  add column if not exists notes text,
  add column if not exists image_rights_confirmed_at timestamptz,
  add column if not exists original_image_path text,
  add column if not exists ai_analysis jsonb,
  add column if not exists kling_prompt text,
  add column if not exists negative_prompt text,
  add column if not exists recommended_settings jsonb,
  add column if not exists prompt_model text,
  add column if not exists analysis_error text,
  add column if not exists analysis_started_at timestamptz,
  add column if not exists analysis_completed_at timestamptz,
  add column if not exists approved_video_path text,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

alter table public.orders
  drop constraint if exists orders_status_check,
  drop constraint if exists orders_property_type_check,
  drop constraint if exists orders_room_type_check,
  drop constraint if exists orders_style_check,
  drop constraint if exists orders_duration_seconds_check,
  drop constraint if exists orders_camera_motion_check,
  drop constraint if exists orders_usage_type_check,
  drop constraint if exists orders_notes_length_check,
  drop constraint if exists orders_ai_analysis_object_check,
  drop constraint if exists orders_recommended_settings_object_check;

alter table public.orders
  add constraint orders_status_check check (
    status in (
      'draft',
      'image_uploaded',
      'payment_pending',
      'paid',
      'prompt_processing',
      'prompt_ready',
      'video_queued',
      'video_processing',
      'quality_review',
      'approved',
      'delivered',
      'failed',
      'refunded'
    )
  ),
  add constraint orders_property_type_check check (
    property_type is null or property_type in (
      'wohnung',
      'haus',
      'neubau',
      'gewerbe'
    )
  ),
  add constraint orders_room_type_check check (
    room_type is null or room_type in (
      'wohnzimmer',
      'schlafzimmer',
      'kueche',
      'badezimmer',
      'aussenbereich',
      'gesamte_immobilie'
    )
  ),
  add constraint orders_style_check check (
    style is null or style in (
      'modern',
      'warm_minimalism',
      'japandi',
      'scandinavian',
      'modern_luxury',
      'architecture_preserved'
    )
  ),
  add constraint orders_duration_seconds_check check (
    duration_seconds is null or duration_seconds in (5, 10, 15)
  ),
  add constraint orders_camera_motion_check check (
    camera_motion is null or camera_motion in (
      'doorway_entrance',
      'slow_dolly_in',
      'lateral_slide',
      'slow_pan',
      'automatic'
    )
  ),
  add constraint orders_usage_type_check check (
    usage_type is null or usage_type in (
      'immobilienportal',
      'website',
      'social_media',
      'expose',
      'werbung'
    )
  ),
  add constraint orders_notes_length_check check (
    notes is null or char_length(notes) <= 1500
  ),
  add constraint orders_ai_analysis_object_check check (
    ai_analysis is null or jsonb_typeof(ai_analysis) = 'object'
  ),
  add constraint orders_recommended_settings_object_check check (
    recommended_settings is null
    or jsonb_typeof(recommended_settings) = 'object'
  );

create index if not exists orders_user_created_at_idx
  on public.orders (user_id, created_at desc);

create index if not exists orders_status_created_at_idx
  on public.orders (status, created_at asc);

create or replace function public.set_vimmoai_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_vimmoai_orders_updated_at on public.orders;

create trigger set_vimmoai_orders_updated_at
before update on public.orders
for each row
execute function public.set_vimmoai_updated_at();

create or replace function public.is_vimmoai_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    auth.uid() is not null
    and exists (
      select 1
      from public.vimmoai_admins as admins
      where admins.user_id = auth.uid()
    );
$$;

/*
 * Drop the known RPC signatures before recreating them so the baseline can
 * normalize an existing function whose return type differs from this schema.
 * The transaction keeps the replacement atomic for API clients.
 */
drop function if exists public.delete_draft_order(uuid);
drop function if exists public.complete_order_upload(uuid, text);
drop function if exists public.claim_order_analysis(uuid);
drop function if exists public.complete_order_analysis(uuid, jsonb, text, text, jsonb, text);
drop function if exists public.fail_order_analysis(uuid, text);

create or replace function public.delete_draft_order(
  p_order_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  deleted_order_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  delete from public.orders as orders
  where orders.id = p_order_id
    and orders.user_id = auth.uid()
    and orders.status = 'draft'
    and orders.original_image_path is null
  returning orders.id into deleted_order_id;

  if deleted_order_id is null then
    raise exception 'Draft order not found' using errcode = 'P0002';
  end if;

  return true;
end;
$$;

create or replace function public.complete_order_upload(
  p_order_id uuid,
  p_original_image_path text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  completed_order_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  if p_original_image_path is null
    or split_part(p_original_image_path, '/', 1) <> auth.uid()::text
    or split_part(p_original_image_path, '/', 2) <> p_order_id::text
    or lower(p_original_image_path) !~ '\.(jpg|jpeg|png|webp)$'
  then
    raise exception 'Invalid original image path' using errcode = '22023';
  end if;

  if not exists (
    select 1
    from storage.objects as objects
    where objects.bucket_id = 'original-images'
      and objects.name = p_original_image_path
  ) then
    raise exception 'Original image was not uploaded' using errcode = 'P0002';
  end if;

  update public.orders as orders
  set
    original_image_path = p_original_image_path,
    status = 'image_uploaded',
    analysis_error = null
  where orders.id = p_order_id
    and orders.user_id = auth.uid()
    and orders.status = 'draft'
    and orders.original_image_path is null
  returning orders.id into completed_order_id;

  if completed_order_id is null then
    raise exception 'Draft order not found or already finalized'
      using errcode = 'P0002';
  end if;

  return true;
end;
$$;

create or replace function public.claim_order_analysis(
  p_order_id uuid
)
returns table (
  id uuid,
  original_image_path text,
  property_type text,
  room_type text,
  style text,
  duration_seconds integer,
  camera_motion text,
  usage_type text,
  notes text
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_vimmoai_admin() then
    raise exception 'Administrator access required' using errcode = '42501';
  end if;

  return query
  update public.orders as orders
  set
    status = 'prompt_processing',
    analysis_started_at = now(),
    analysis_completed_at = null,
    analysis_error = null
  where orders.id = p_order_id
    and orders.original_image_path is not null
    and orders.status in ('image_uploaded', 'paid', 'failed')
  returning
    orders.id,
    orders.original_image_path,
    orders.property_type,
    orders.room_type,
    orders.style,
    orders.duration_seconds,
    orders.camera_motion,
    orders.usage_type,
    orders.notes;
end;
$$;

create or replace function public.complete_order_analysis(
  p_order_id uuid,
  p_ai_analysis jsonb,
  p_kling_prompt text,
  p_negative_prompt text,
  p_recommended_settings jsonb,
  p_prompt_model text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  completed_order_id uuid;
begin
  if not public.is_vimmoai_admin() then
    raise exception 'Administrator access required' using errcode = '42501';
  end if;

  if jsonb_typeof(p_ai_analysis) <> 'object'
    or jsonb_typeof(p_recommended_settings) <> 'object'
    or nullif(btrim(p_kling_prompt), '') is null
    or nullif(btrim(p_negative_prompt), '') is null
    or nullif(btrim(p_prompt_model), '') is null
  then
    raise exception 'Invalid analysis result' using errcode = '22023';
  end if;

  update public.orders as orders
  set
    ai_analysis = p_ai_analysis,
    kling_prompt = p_kling_prompt,
    negative_prompt = p_negative_prompt,
    recommended_settings = p_recommended_settings,
    prompt_model = p_prompt_model,
    analysis_error = null,
    analysis_completed_at = now(),
    status = 'prompt_ready'
  where orders.id = p_order_id
    and orders.status = 'prompt_processing'
  returning orders.id into completed_order_id;

  if completed_order_id is null then
    raise exception 'Order is not being analyzed' using errcode = 'P0002';
  end if;

  return true;
end;
$$;

create or replace function public.fail_order_analysis(
  p_order_id uuid,
  p_error text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  failed_order_id uuid;
begin
  if not public.is_vimmoai_admin() then
    raise exception 'Administrator access required' using errcode = '42501';
  end if;

  update public.orders as orders
  set
    analysis_error = left(coalesce(p_error, 'Unknown analysis error'), 2000),
    analysis_completed_at = now(),
    status = 'failed'
  where orders.id = p_order_id
    and orders.status = 'prompt_processing'
  returning orders.id into failed_order_id;

  if failed_order_id is null then
    raise exception 'Order is not being analyzed' using errcode = 'P0002';
  end if;

  return true;
end;
$$;

/*
 * Browser roles receive only the minimum table privileges. All state changes
 * after insertion happen through the narrowly-scoped RPCs above.
 */
revoke all on table public.orders from anon, authenticated;
grant select, insert on table public.orders to authenticated;

revoke all on table public.vimmoai_admins from anon, authenticated;

revoke all on function public.set_vimmoai_updated_at() from public, anon, authenticated;
revoke all on function public.is_vimmoai_admin() from public, anon, authenticated;
revoke all on function public.delete_draft_order(uuid) from public, anon, authenticated;
revoke all on function public.complete_order_upload(uuid, text) from public, anon, authenticated;
revoke all on function public.claim_order_analysis(uuid) from public, anon, authenticated;
revoke all on function public.complete_order_analysis(uuid, jsonb, text, text, jsonb, text) from public, anon, authenticated;
revoke all on function public.fail_order_analysis(uuid, text) from public, anon, authenticated;

grant execute on function public.is_vimmoai_admin() to authenticated;
grant execute on function public.delete_draft_order(uuid) to authenticated;
grant execute on function public.complete_order_upload(uuid, text) to authenticated;
grant execute on function public.claim_order_analysis(uuid) to authenticated;
grant execute on function public.complete_order_analysis(uuid, jsonb, text, text, jsonb, text) to authenticated;
grant execute on function public.fail_order_analysis(uuid, text) to authenticated;

alter table public.orders enable row level security;
alter table public.vimmoai_admins enable row level security;

drop policy if exists orders_select_own_or_admin on public.orders;
drop policy if exists orders_insert_own_draft on public.orders;

create policy orders_select_own_or_admin
on public.orders
for select
to authenticated
using (
  user_id = auth.uid()
  or public.is_vimmoai_admin()
);

create policy orders_insert_own_draft
on public.orders
for insert
to authenticated
with check (
  user_id = auth.uid()
  and status = 'draft'
  and image_rights_confirmed_at is not null
  and image_rights_confirmed_at <= now() + interval '5 minutes'
  and original_image_path is null
  and approved_video_path is null
  and ai_analysis is null
  and kling_prompt is null
  and negative_prompt is null
  and recommended_settings is null
  and prompt_model is null
  and analysis_error is null
  and analysis_started_at is null
  and analysis_completed_at is null
);

/*
 * Buckets are private. Metadata limits are a second line of defence in
 * addition to the browser-side validation.
 */
insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'original-images',
  'original-images',
  false,
  20971520,
  array['image/jpeg', 'image/png', 'image/webp']::text[]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'generated-videos',
  'generated-videos',
  false,
  524288000,
  array['video/mp4', 'video/webm']::text[]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists original_images_select_own_or_admin on storage.objects;
drop policy if exists original_images_insert_own_draft on storage.objects;
drop policy if exists original_images_delete_own_draft_or_admin on storage.objects;
drop policy if exists generated_videos_select_approved_or_admin on storage.objects;
drop policy if exists generated_videos_insert_admin on storage.objects;
drop policy if exists generated_videos_update_admin on storage.objects;
drop policy if exists generated_videos_delete_admin on storage.objects;

create policy original_images_select_own_or_admin
on storage.objects
for select
to authenticated
using (
  bucket_id = 'original-images'
  and (
    public.is_vimmoai_admin()
    or exists (
      select 1
      from public.orders as orders
      where orders.user_id = auth.uid()
        and orders.original_image_path = storage.objects.name
    )
  )
);

create policy original_images_insert_own_draft
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'original-images'
  and (storage.foldername(name))[1] = auth.uid()::text
  and exists (
    select 1
    from public.orders as orders
    where orders.id::text = (storage.foldername(name))[2]
      and orders.user_id = auth.uid()
      and orders.status = 'draft'
      and orders.original_image_path is null
  )
);

create policy original_images_delete_own_draft_or_admin
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'original-images'
  and (
    public.is_vimmoai_admin()
    or exists (
      select 1
      from public.orders as orders
      where orders.id::text = (storage.foldername(storage.objects.name))[2]
        and orders.user_id = auth.uid()
        and orders.status = 'draft'
        and orders.original_image_path is null
    )
  )
);

create policy generated_videos_select_approved_or_admin
on storage.objects
for select
to authenticated
using (
  bucket_id = 'generated-videos'
  and (
    public.is_vimmoai_admin()
    or exists (
      select 1
      from public.orders as orders
      where orders.user_id = auth.uid()
        and orders.approved_video_path = storage.objects.name
        and orders.status in ('approved', 'delivered')
    )
  )
);

create policy generated_videos_insert_admin
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'generated-videos'
  and public.is_vimmoai_admin()
  and exists (
    select 1
    from public.orders as orders
    where orders.user_id::text = (storage.foldername(name))[1]
      and orders.id::text = (storage.foldername(name))[2]
  )
);

create policy generated_videos_update_admin
on storage.objects
for update
to authenticated
using (
  bucket_id = 'generated-videos'
  and public.is_vimmoai_admin()
)
with check (
  bucket_id = 'generated-videos'
  and public.is_vimmoai_admin()
  and exists (
    select 1
    from public.orders as orders
    where orders.user_id::text = (storage.foldername(name))[1]
      and orders.id::text = (storage.foldername(name))[2]
  )
);

create policy generated_videos_delete_admin
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'generated-videos'
  and public.is_vimmoai_admin()
);

comment on table public.vimmoai_admins is
  'Server-managed allowlist for VimmoAI production administrators.';

comment on table public.orders is
  'Customer visualization requests and their AI/video production lifecycle.';

comment on column public.orders.image_rights_confirmed_at is
  'Timestamp of the customer image-rights confirmation. The UI must populate this field.';

commit;
