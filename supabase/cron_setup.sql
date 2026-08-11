-- Eseguire come ruolo postgres dopo aver distribuito la Edge Function refresh-data.
create extension if not exists pg_net;
create extension if not exists supabase_vault;

create or replace function public.configure_lia_edge_refresh(
  p_project_url text,
  p_publishable_key text,
  p_cron_secret text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  secret_record record;
begin
  if p_project_url !~ '^https://[a-z0-9-]+\.supabase\.co$' then
    raise exception 'Invalid Supabase project URL';
  end if;
  if char_length(p_publishable_key) < 20 or char_length(p_cron_secret) < 16 then
    raise exception 'Invalid publishable key or cron secret';
  end if;

  select id into secret_record from vault.decrypted_secrets where name = 'lia_project_url' limit 1;
  if found then perform vault.update_secret(secret_record.id, p_project_url, 'lia_project_url', 'LIA Drive Supabase URL');
  else perform vault.create_secret(p_project_url, 'lia_project_url', 'LIA Drive Supabase URL'); end if;

  select id into secret_record from vault.decrypted_secrets where name = 'lia_publishable_key' limit 1;
  if found then perform vault.update_secret(secret_record.id, p_publishable_key, 'lia_publishable_key', 'LIA Drive publishable key');
  else perform vault.create_secret(p_publishable_key, 'lia_publishable_key', 'LIA Drive publishable key'); end if;

  select id into secret_record from vault.decrypted_secrets where name = 'lia_cron_secret' limit 1;
  if found then perform vault.update_secret(secret_record.id, p_cron_secret, 'lia_cron_secret', 'LIA Drive cron secret');
  else perform vault.create_secret(p_cron_secret, 'lia_cron_secret', 'LIA Drive cron secret'); end if;

  perform cron.unschedule(jobid) from cron.job where jobname = 'lia-edge-refresh-every-15-minutes';
  perform cron.schedule(
    'lia-edge-refresh-every-15-minutes',
    '*/15 * * * *',
    $job$
      select net.http_post(
        url := (select decrypted_secret from vault.decrypted_secrets where name = 'lia_project_url' limit 1) || '/functions/v1/refresh-data',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'lia_publishable_key' limit 1),
          'X-Cron-Secret', (select decrypted_secret from vault.decrypted_secrets where name = 'lia_cron_secret' limit 1)
        ),
        body := jsonb_build_object('scheduled_at', timezone('utc', now())),
        timeout_milliseconds := 10000
      );
    $job$
  );
end;
$$;

revoke all on function public.configure_lia_edge_refresh(text, text, text) from public, anon, authenticated;
grant execute on function public.configure_lia_edge_refresh(text, text, text) to postgres;
