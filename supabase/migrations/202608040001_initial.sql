begin;

create extension if not exists pgcrypto;
create extension if not exists pg_cron;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create table public.user_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text check (char_length(display_name) <= 120),
  timezone text not null default 'Europe/Rome',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.user_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  language text not null default 'it' check (char_length(language) between 2 and 8),
  units text not null default 'metric' check (units = 'metric'),
  interests text[] not null default array['viaggi','storia','cultura']::text[],
  news_topics text[] not null default array['mobilità','territorio']::text[],
  accessibility_mode boolean not null default false,
  avatar_enabled boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.gps_events (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users(id) on delete cascade,
  latitude double precision not null check (latitude between -90 and 90),
  longitude double precision not null check (longitude between -180 and 180),
  accuracy_meters double precision check (accuracy_meters >= 0),
  altitude_meters double precision check (altitude_meters between -500 and 10000),
  heading_degrees double precision check (heading_degrees between 0 and 360),
  speed_mps double precision check (speed_mps between 0 and 300),
  recorded_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now())
);

create table public.cached_feeds (
  cache_key text primary key,
  source text not null,
  payload jsonb not null,
  refreshed_at timestamptz not null default timezone('utc', now()),
  expires_at timestamptz not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint cached_feeds_expiry check (expires_at > refreshed_at)
);

create table public.service_logs (
  id bigint generated always as identity primary key,
  level text not null check (level in ('debug','info','warn','error')),
  service text not null,
  message text not null,
  request_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create table public.service_health (
  service text primary key,
  status text not null check (status in ('operational','degraded','outage')),
  latency_ms integer check (latency_ms >= 0),
  details jsonb not null default '{}'::jsonb,
  checked_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.avatar_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  provider_session_id text unique,
  status text not null default 'created' check (status in ('created','active','completed','failed')),
  embed_url text,
  metadata jsonb not null default '{}'::jsonb,
  started_at timestamptz,
  ended_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.rate_limit_buckets (
  bucket_key text primary key,
  hits integer not null default 0 check (hits >= 0),
  window_started_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index gps_events_user_recorded_idx on public.gps_events (user_id, recorded_at desc) where user_id is not null;
create index gps_events_recorded_idx on public.gps_events (recorded_at desc);
create index cached_feeds_expires_idx on public.cached_feeds (expires_at);
create index service_logs_created_idx on public.service_logs (created_at desc);
create index service_logs_service_created_idx on public.service_logs (service, created_at desc);
create index avatar_sessions_user_created_idx on public.avatar_sessions (user_id, created_at desc);
create index rate_limit_window_idx on public.rate_limit_buckets (window_started_at);

create trigger user_profiles_updated_at before update on public.user_profiles for each row execute function public.set_updated_at();
create trigger user_preferences_updated_at before update on public.user_preferences for each row execute function public.set_updated_at();
create trigger cached_feeds_updated_at before update on public.cached_feeds for each row execute function public.set_updated_at();
create trigger service_health_updated_at before update on public.service_health for each row execute function public.set_updated_at();
create trigger avatar_sessions_updated_at before update on public.avatar_sessions for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.user_profiles (id, display_name)
  values (new.id, coalesce(new.raw_app_meta_data ->> 'display_name', split_part(coalesce(new.email, 'utente'), '@', 1)))
  on conflict (id) do nothing;
  insert into public.user_preferences (user_id) values (new.id) on conflict (user_id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

create or replace function public.consume_rate_limit(p_key text, p_limit integer, p_window_seconds integer)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_hits integer;
  current_window timestamptz;
begin
  if p_limit < 1 or p_window_seconds < 1 then
    raise exception 'Rate limit and window must be positive';
  end if;
  insert into public.rate_limit_buckets (bucket_key, hits, window_started_at, updated_at)
  values (p_key, 1, timezone('utc', now()), timezone('utc', now()))
  on conflict (bucket_key) do update
  set hits = case when public.rate_limit_buckets.window_started_at <= timezone('utc', now()) - make_interval(secs => p_window_seconds) then 1 else public.rate_limit_buckets.hits + 1 end,
      window_started_at = case when public.rate_limit_buckets.window_started_at <= timezone('utc', now()) - make_interval(secs => p_window_seconds) then timezone('utc', now()) else public.rate_limit_buckets.window_started_at end,
      updated_at = timezone('utc', now())
  returning hits, window_started_at into current_hits, current_window;
  return current_hits <= p_limit and current_window > timezone('utc', now()) - make_interval(secs => p_window_seconds);
end;
$$;

create or replace function public.prune_operational_data()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.cached_feeds where expires_at < timezone('utc', now()) - interval '1 day';
  delete from public.service_logs where created_at < timezone('utc', now()) - interval '30 days';
  delete from public.gps_events where recorded_at < timezone('utc', now()) - interval '90 days';
  delete from public.rate_limit_buckets where updated_at < timezone('utc', now()) - interval '1 day';
end;
$$;

create or replace view public.service_status_view with (security_invoker = true) as
select service, status, latency_ms, details, checked_at,
  case when checked_at < timezone('utc', now()) - interval '30 minutes' then true else false end as stale
from public.service_health;

create or replace view public.user_recent_gps_view with (security_invoker = true) as
select id, user_id, latitude, longitude, accuracy_meters, speed_mps, recorded_at
from public.gps_events
where recorded_at >= timezone('utc', now()) - interval '24 hours';

alter table public.user_profiles enable row level security;
alter table public.user_preferences enable row level security;
alter table public.gps_events enable row level security;
alter table public.cached_feeds enable row level security;
alter table public.service_logs enable row level security;
alter table public.service_health enable row level security;
alter table public.avatar_sessions enable row level security;
alter table public.rate_limit_buckets enable row level security;

create policy user_profiles_select_own on public.user_profiles for select to authenticated using ((select auth.uid()) = id);
create policy user_profiles_update_own on public.user_profiles for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);
create policy user_preferences_select_own on public.user_preferences for select to authenticated using ((select auth.uid()) = user_id);
create policy user_preferences_insert_own on public.user_preferences for insert to authenticated with check ((select auth.uid()) = user_id);
create policy user_preferences_update_own on public.user_preferences for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy gps_events_select_own on public.gps_events for select to authenticated using ((select auth.uid()) = user_id);
create policy gps_events_insert_own on public.gps_events for insert to authenticated with check ((select auth.uid()) = user_id);
create policy avatar_sessions_select_own on public.avatar_sessions for select to authenticated using ((select auth.uid()) = user_id);
create policy avatar_sessions_insert_own on public.avatar_sessions for insert to authenticated with check ((select auth.uid()) = user_id);
create policy avatar_sessions_update_own on public.avatar_sessions for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

revoke all on public.cached_feeds, public.service_logs, public.service_health, public.rate_limit_buckets from anon, authenticated;
revoke all on function public.consume_rate_limit(text, integer, integer) from public, anon, authenticated;
revoke all on function public.prune_operational_data() from public, anon, authenticated;
grant execute on function public.consume_rate_limit(text, integer, integer) to service_role;
grant execute on function public.prune_operational_data() to service_role, postgres;
grant select, update on public.user_profiles to authenticated;
grant select, insert, update on public.user_preferences to authenticated;
grant select, insert on public.gps_events to authenticated;
grant select, insert, update on public.avatar_sessions to authenticated;
grant select on public.user_recent_gps_view to authenticated;
grant all on public.cached_feeds, public.service_logs, public.service_health, public.rate_limit_buckets to service_role;

select cron.unschedule(jobid) from cron.job where jobname = 'lia-maintenance-every-15-minutes';
select cron.schedule('lia-maintenance-every-15-minutes', '*/15 * * * *', 'select public.prune_operational_data();');

commit;
