# Deploy

## Preparazione

1. Generare CRON_SECRET, ADMIN_API_KEY, JWT_SECRET e AI_GATEWAY_SECRET indipendenti.
2. Creare un progetto Supabase nella regione più vicina alla regione Vercel.
3. Creare un progetto Vercel collegato al repository GitHub.
4. Inserire tutte le variabili server-side nei rispettivi secret store.

## Supabase

```bash
supabase login
supabase link --project-ref PROJECT_REF
supabase db push
supabase secrets set CRON_SECRET=VALUE LIA_API_BASE_URL=https://DOMAIN
supabase functions deploy refresh-data
```

Nel SQL Editor eseguire supabase/cron_setup.sql, poi:

```sql
select public.configure_lia_edge_refresh(
  'https://PROJECT_REF.supabase.co',
  'SUPABASE_PUBLISHABLE_KEY',
  'CRON_SECRET'
);
```

## Vercel

```bash
vercel login
vercel link
vercel env add SUPABASE_URL production
vercel env add SUPABASE_PUBLISHABLE_KEY production
vercel env add SUPABASE_SERVICE_ROLE_KEY production
vercel env add OPENAI_API_KEY production
vercel env add CRON_SECRET production
vercel env add ADMIN_API_KEY production
vercel env add AI_GATEWAY_SECRET production
vercel deploy --prod
```

Configurare ALLOWED_ORIGINS con il dominio di produzione. Impostare TOMTOM_API_KEY solo per traffico live. L embed LiveAvatar fornito funziona già senza API key; la key serve per provisioning dinamico.

## Verifica

```bash
curl https://DOMAIN/api/health
curl "https://DOMAIN/api/dashboard?lat=41.9028&lon=12.4964"
curl -H "Authorization: Bearer CRON_SECRET" https://DOMAIN/api/cron/refresh
```

Verificare poi service_health, cron.job e cron.job_run_details su Supabase.

## GitHub

La CI esegue verify su push e pull request. Per creare una release, taggare v1.0.0 e fare push: il workflow release pubblica note generate automaticamente.
