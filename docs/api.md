# API

Base URL locale: http://127.0.0.1:3000. Tutte le risposte di errore usano error.code, error.message, error.details e requestId.

## Coordinate

Gli endpoint geografici richiedono query lat e lon; force=true invalida la cache. Esempio:

```bash
curl "http://127.0.0.1:3000/api/dashboard?lat=45.4642&lon=9.1900"
```

## Autenticazione

Authorization: Bearer TOKEN accetta un access token Supabase o un JWT HS256 firmato con JWT_SECRET. Le scritture preferenze richiedono autenticazione. Il GPS POST accetta sessioni anonime ma persiste soltanto attraverso l API server con service role.

## Chat Completions

POST /api/chat/completions accetta messages compatibili con Chat Completions, model, temperature, max_completion_tokens (o max_tokens legacy), location e preferences. Il server inserisce automaticamente un system message contenente traffico, meteo, news, luogo, storia, contesto e preferenze.

```json
{
  "model": "gpt-5-mini",
  "messages": [{ "role": "user", "content": "Riassumi il percorso" }],
  "location": { "lat": 41.9028, "lon": 12.4964 },
  "stream": false
}
```

Se AI_GATEWAY_SECRET è configurato, inviare X-LIA-API-Key oppure Authorization Bearer con lo stesso valore. Lo streaming è disabilitato intenzionalmente per mantenere piena compatibilità con Vercel Functions e LiveAvatar custom LLM sincrono.

## Avatar

- GET /api/avatar restituisce configurazione sanitizzata.
- POST action=embed crea un embed V2 LiveAvatar; richiede JWT salvo ALLOW_ANONYMOUS_AVATAR=true.
- POST action=provision-context crea il contesto LIA; richiede X-Admin-Key.

## Cron

GET /api/cron/refresh richiede Authorization: Bearer CRON_SECRET in produzione e forza il refresh del set di coordinate di riferimento. Aggiorna service_health quando Supabase è disponibile.
