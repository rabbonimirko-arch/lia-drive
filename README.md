# LIA Drive

LIA Drive è un assistente di viaggio contestuale pronto per Vercel, Supabase, OpenAI e LiveAvatar. La dashboard combina traffico, meteo, notizie locali, luoghi, storia, GPS, preferenze, log e stato servizi. Funziona localmente anche senza credenziali cloud: i provider pubblici restano attivi, il traffico usa una stima dichiarata e le integrazioni protette segnalano esattamente la configurazione mancante.

## Funzioni

- Dashboard responsive Tailwind senza framework frontend.
- Vercel Functions TypeScript per traffico, meteo, news, luoghi, storia, preferenze, GPS, dashboard, avatar e Chat Completions.
- Cache intelligente in memoria e su Supabase con TTL, retry esponenziale e stale-friendly HTTP headers.
- Aggiornamento client e cron ogni 15 minuti.
- Supabase con migrazioni, RLS, trigger, viste security-invoker, indici, rate limit atomico e manutenzione pg_cron.
- Endpoint OpenAI Chat Completions compatibile arricchito automaticamente con tutto il contesto di viaggio.
- LiveAvatar con embed, knowledge, prompt, personality, context, voice e safety.
- Logging JSON, persistenza log opzionale, stato servizi e richieste tracciate con request ID.
- Test unitari, integrazione ed end-to-end Playwright.

## Avvio rapido

Requisiti: Node.js 22 o superiore e npm.

```bash
npm install
copy .env.example .env
npm run dev
```

Aprire http://127.0.0.1:3000. La configurazione minima non richiede chiavi. Per abilitare AI, persistenza, traffico live e provisioning avatar, compilare le variabili indicate sotto.

## Architettura

```mermaid
flowchart LR
  Browser[Dashboard HTML + Tailwind + TypeScript] --> API[Vercel Functions]
  API --> Cache[Cache memoria + Supabase]
  API --> Providers[Open-Meteo · OSM · Wikipedia · Google News · TomTom]
  API --> OpenAI[OpenAI Chat Completions]
  API --> LiveAvatar[LiveAvatar Embed/API]
  API --> DB[(Supabase Postgres)]
  Cron[Supabase pg_cron + Edge Function] --> Refresh[/api/cron/refresh]
  Refresh --> Cache
  DB --> RLS[RLS · Trigger · Views · Logs]
```

Dettagli: [docs/architecture.md](docs/architecture.md).

## API

| Metodo   | Endpoint              | Scopo                                |
| -------- | --------------------- | ------------------------------------ |
| GET      | /api/health           | Salute runtime e integrazioni        |
| GET      | /api/traffic          | Traffico live o stima dichiarata     |
| GET      | /api/weather          | Meteo corrente Open-Meteo            |
| GET      | /api/news             | News locali da RSS                   |
| GET      | /api/places           | Reverse geocoding e luoghi vicini    |
| GET      | /api/history          | Contenuti storici geolocalizzati     |
| GET/PUT  | /api/preferences      | Preferenze utente                    |
| GET/POST | /api/gps              | Cronologia o acquisizione GPS        |
| GET      | /api/dashboard        | Aggregato completo dashboard         |
| GET/POST | /api/avatar           | Stato, embed e provisioning contesto |
| POST     | /api/chat/completions | OpenAI-compatible Chat Completions   |
| GET      | /api/cron/refresh     | Refresh protetto ogni 15 minuti      |

Le API geografiche accettano lat e lon. Specifica completa: [docs/api.md](docs/api.md) e [docs/openapi.yaml](docs/openapi.yaml).

## Variabili ambiente

| Variabile                 | Necessaria            | Uso                                                     |
| ------------------------- | --------------------- | ------------------------------------------------------- |
| APP_BASE_URL              | deploy                | URL pubblica applicazione                               |
| ALLOWED_ORIGINS           | sì in produzione      | Lista CORS separata da virgole                          |
| CRON_SECRET               | sì in produzione      | Protezione cron Vercel/Supabase                         |
| ADMIN_API_KEY             | per provisioning      | Protegge creazione contesto LiveAvatar                  |
| JWT_SECRET                | auth locale opzionale | Verifica JWT HS256 quando Supabase Auth non è usato     |
| SUPABASE_URL              | per database          | URL progetto Supabase                                   |
| SUPABASE_PUBLISHABLE_KEY  | per auth              | Validazione token utente                                |
| SUPABASE_SERVICE_ROLE_KEY | solo server           | Cache, log, GPS e rate limit                            |
| OPENAI_API_KEY            | per chat              | Chiamate OpenAI                                         |
| OPENAI_MODEL              | opzionale             | Modello, default gpt-5-mini                             |
| AI_GATEWAY_SECRET         | consigliata           | Protegge Chat Completions per LiveAvatar/custom clients |
| LIVEAVATAR_API_KEY        | provisioning dinamico | API LiveAvatar                                          |
| LIVEAVATAR_AVATAR_ID      | embed dinamico        | Avatar LiveAvatar                                       |
| LIVEAVATAR_CONTEXT_ID     | opzionale             | Contesto LiveAvatar                                     |
| LIVEAVATAR_VOICE_ID       | opzionale             | Voce LiveAvatar                                         |
| LIVEAVATAR_EMBED_URL      | già configurata       | Embed fornito per LIA                                   |
| TOMTOM_API_KEY            | opzionale             | Traffico live; senza usa stima etichettata              |

Non esporre mai service role, OpenAI, LiveAvatar, cron o admin key nel browser.

## Database

1. Collegare il progetto con Supabase CLI.
2. Eseguire supabase db push.
3. Distribuire la funzione refresh-data.
4. Impostare i secrets CRON_SECRET e LIA_API_BASE_URL.
5. Eseguire supabase/cron_setup.sql e chiamare configure_lia_edge_refresh con URL, publishable key e cron secret.

Schema e policy: [docs/database.md](docs/database.md).

## Deploy

### Vercel

```bash
vercel link
vercel env add OPENAI_API_KEY production
vercel env add CRON_SECRET production
vercel deploy --prod
```

vercel.json pubblica le funzioni. Il refresh ogni 15 minuti è gestito da Supabase pg_cron tramite la Edge Function refresh-data, così funziona anche sui piani Vercel Hobby. Su Vercel Pro il medesimo endpoint può essere richiamato anche da Vercel Cron con Authorization: Bearer CRON_SECRET.

### Supabase

```bash
supabase link --project-ref PROJECT_REF
supabase db push
supabase secrets set CRON_SECRET=... LIA_API_BASE_URL=https://lia-drive.example
supabase functions deploy refresh-data
```

Guida completa: [docs/deploy.md](docs/deploy.md).

## LiveAvatar

L'embed predefinito è quello fornito per LIA ed è già presente in dashboard, .env.example, liveavatar/context.json e liveavatar/embed.html. POST /api/avatar con action=embed crea un nuovo embed se LIVEAVATAR_API_KEY e LIVEAVATAR_AVATAR_ID sono configurati. action=provision-context crea il contesto e richiede X-Admin-Key.

## Sicurezza

- JWT Supabase o HS256 locale; nessuna decisione di autorizzazione usa user metadata modificabili.
- RLS su ogni tabella public e viste security_invoker.
- CORS allowlist, CSP, input validation Zod, rate limit, request ID e error envelope uniforme.
- Service role e provider keys restano esclusivamente server-side.
- Cron e provisioning richiedono segreti dedicati.

Dettagli: [docs/security.md](docs/security.md).

## Qualità

```bash
npm run format:check
npm run lint
npm run typecheck
npm run test
npm run test:e2e
npm run verify
```

## Struttura

```text
api/                       Vercel Functions e servizi condivisi
public/                    HTML e asset compilati
src/client/                TypeScript browser
src/styles/                Tailwind source
supabase/migrations/       schema, RLS, trigger, viste, cron
supabase/functions/        Edge Function refresh-data
liveavatar/                 knowledge, prompt, personality, voice, safety, embed
tests/                     unit, integration, end-to-end
docs/                      architettura, API, DB, deploy, sicurezza, operations
```

## Licenza

MIT, vedere [LICENSE](LICENSE).
