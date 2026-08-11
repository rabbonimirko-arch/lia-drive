# Sicurezza

## Confini di fiducia

- Browser: nessun segreto; usa solo API pubbliche del progetto e iframe LiveAvatar.
- Vercel Functions: conserva service role e provider keys, valida input e autorizzazione.
- Supabase: RLS, grants minimi, funzioni security definer con search_path vuoto.
- Provider esterni: timeout, retry selettivo, parsing limitato e output sanificato dal client.

## Controlli

- JWT verificato tramite Supabase auth.getUser o jose HS256.
- CORS allowlist e preflight.
- CSP, X-Content-Type-Options, Referrer-Policy e Permissions-Policy.
- Zod su query e body.
- Rate limit persistente via RPC o fallback per istanza.
- Errori generici 500 senza stack al client; log JSON server-side con request ID.
- Cron protetto da bearer secret, provisioning da admin key, AI gateway da secret dedicato.

## Operazioni consigliate

- Ruotare segreti almeno ogni 90 giorni e dopo ogni esposizione sospetta.
- Non usare SUPABASE_SERVICE_ROLE_KEY in variabili pubbliche o bundle frontend.
- Mantenere token JWT brevi; per operazioni sensibili validare sempre il token corrente.
- Limitare ALLOWED_ORIGINS ai domini effettivi.
- Monitorare service_logs, service_health e risposte 429/5xx.
