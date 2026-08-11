# Database

## Tabelle

| Tabella            | Contenuto                                | Retention          |
| ------------------ | ---------------------------------------- | ------------------ |
| user_profiles      | Profilo minimo utente                    | vita account       |
| user_preferences   | Lingua, interessi, accessibilità, avatar | vita account       |
| gps_events         | Coordinate e precisione                  | 90 giorni          |
| cached_feeds       | Envelope cache provider                  | scaduti + 1 giorno |
| service_logs       | Log strutturati                          | 30 giorni          |
| service_health     | Ultimo stato per servizio                | corrente           |
| avatar_sessions    | Sessioni avatar per utente               | vita account       |
| rate_limit_buckets | Contatori atomici API                    | 1 giorno           |

## RLS

RLS è abilitata su tutte le tabelle public. Gli utenti autenticati possono leggere/aggiornare solo profilo, preferenze, GPS e sessioni avatar propri. Cache, log, health e rate limiting non hanno policy pubbliche e sono accessibili solo al service role.

Le policy usano (select auth.uid()) per evitare rivalutazioni per riga. Le viste usano security_invoker=true, quindi ereditano RLS dell invocante.

## Trigger e funzioni

- set_updated_at aggiorna automaticamente updated_at.
- handle_new_user crea profilo e preferenze su auth.users senza usare raw_user_meta_data per autorizzazione.
- consume_rate_limit esegue un upsert atomico e restituisce boolean.
- prune_operational_data applica retention.
- cron.schedule esegue manutenzione ogni 15 minuti.

## Indici

Gli indici coprono query GPS per utente/tempo, scadenza cache, log recenti, sessioni avatar e finestre rate-limit.

## Edge refresh

supabase/cron_setup.sql installa pg_net e Vault e fornisce configure_lia_edge_refresh. I segreti vengono salvati in Vault e il job chiama refresh-data ogni 15 minuti. La funzione inoltra la richiesta all endpoint Vercel /api/cron/refresh usando lo stesso CRON_SECRET.
