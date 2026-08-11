const corsHeaders = { 'Content-Type': 'application/json' };
Deno.serve(async (request: Request) => {
  if (request.method !== 'POST')
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: corsHeaders,
    });
  const cronSecret = Deno.env.get('CRON_SECRET');
  const suppliedSecret = request.headers.get('x-cron-secret');
  if (!cronSecret || suppliedSecret !== cronSecret)
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: corsHeaders,
    });
  const baseUrl = Deno.env.get('LIA_API_BASE_URL');
  if (!baseUrl)
    return new Response(JSON.stringify({ error: 'LIA_API_BASE_URL not configured' }), {
      status: 503,
      headers: corsHeaders,
    });
  try {
    const response = await fetch(new URL('/api/cron/refresh', baseUrl), {
      method: 'GET',
      headers: { Authorization: 'Bearer ' + cronSecret },
      signal: AbortSignal.timeout(55000),
    });
    const payload = await response.text();
    return new Response(payload, { status: response.status, headers: corsHeaders });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Refresh failed' }),
      { status: 502, headers: corsHeaders },
    );
  }
});
