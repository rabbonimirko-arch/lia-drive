# Operations

## Frequenze

- Dashboard browser: ogni 15 minuti.
- Supabase Edge refresh tramite pg_cron: ogni 15 minuti.
- Supabase manutenzione: ogni 15 minuti.
- Vercel Cron: opzionale sui piani che consentono frequenze inferiori a un giorno.
- Cache weather/traffic/news: 15 minuti.
- Cache places: 30 minuti.
- Reverse geocoding: 60 minuti.
- Storia: 24 ore.

## Diagnostica

1. GET /api/health per disponibilità integrazioni.
2. Controllare X-Request-Id e service_logs.
3. Controllare service_status_view e stale.
4. Per cron Supabase interrogare cron.job_run_details.
5. Per provider 429/5xx verificare retry e scadenza cache.

## Degrado previsto

- Senza TomTom: traffico stimato e marcato estimated.
- Senza Supabase: cache memoria, preferenze locali, log console e GPS non persistito.
- Senza OpenAI: dashboard completa; chat restituisce openai_not_configured.
- Senza LiveAvatar API key: embed fornito operativo; provisioning dinamico disabilitato.
