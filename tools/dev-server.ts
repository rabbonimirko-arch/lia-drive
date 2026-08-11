import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize, relative } from 'node:path';
import type { VercelRequest, VercelResponse } from '../api/_lib/vercel-types';
import health from '../api/health';
import traffic from '../api/traffic';
import weather from '../api/weather';
import news from '../api/news';
import places from '../api/places';
import history from '../api/history';
import preferences from '../api/preferences';
import gps from '../api/gps';
import dashboard from '../api/dashboard';
import avatar from '../api/avatar';
import chatCompletions from '../api/chat/completions';
import cronRefresh from '../api/cron/refresh';

const handlers: Record<
  string,
  (request: VercelRequest, response: VercelResponse) => Promise<void> | void
> = {
  '/api/health': health,
  '/api/traffic': traffic,
  '/api/weather': weather,
  '/api/news': news,
  '/api/places': places,
  '/api/history': history,
  '/api/preferences': preferences,
  '/api/gps': gps,
  '/api/dashboard': dashboard,
  '/api/avatar': avatar,
  '/api/chat/completions': chatCompletions,
  '/api/cron/refresh': cronRefresh,
};
const mimeTypes: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.map': 'application/json',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
};
async function readBody(request: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  for await (const chunk of request) chunks.push(Buffer.from(chunk));
  if (!chunks.length) return undefined;
  const raw = Buffer.concat(chunks).toString('utf8');
  if (request.headers['content-type']?.includes('application/json')) return JSON.parse(raw);
  return raw;
}
function queryObject(url: URL): Record<string, string | string[]> {
  const result: Record<string, string | string[]> = {};
  for (const [key, value] of url.searchParams) {
    const current = result[key];
    result[key] =
      current === undefined
        ? value
        : Array.isArray(current)
          ? [...current, value]
          : [current, value];
  }
  return result;
}
function enhanceResponse(response: ServerResponse): VercelResponse {
  const target = response as VercelResponse;
  target.status = ((code: number) => {
    response.statusCode = code;
    return target;
  }) as VercelResponse['status'];
  target.json = ((body: unknown) => {
    if (!response.hasHeader('Content-Type'))
      response.setHeader('Content-Type', 'application/json; charset=utf-8');
    response.end(JSON.stringify(body));
    return target;
  }) as VercelResponse['json'];
  target.send = ((body: unknown) => {
    response.end(typeof body === 'string' || Buffer.isBuffer(body) ? body : JSON.stringify(body));
    return target;
  }) as VercelResponse['send'];
  return target;
}
async function serveStatic(pathname: string, response: ServerResponse): Promise<void> {
  let requested = pathname === '/' ? 'index.html' : decodeURIComponent(pathname);
  while (requested.startsWith('/')) requested = requested.slice(1);
  const publicRoot = join(process.cwd(), 'public');
  const filePath = normalize(join(publicRoot, requested));
  const traversal = relative(publicRoot, filePath);
  if (traversal.startsWith('..') || traversal.includes(':')) {
    response.writeHead(403).end('Forbidden');
    return;
  }
  try {
    const info = await stat(filePath);
    if (!info.isFile()) throw new Error('Not a file');
    const content = await readFile(filePath);
    response.setHeader('Content-Type', mimeTypes[extname(filePath)] ?? 'application/octet-stream');
    response.setHeader(
      'Cache-Control',
      extname(filePath) === '.html' ? 'no-cache' : 'public, max-age=300',
    );
    response.end(content);
  } catch {
    response
      .writeHead(404, { 'Content-Type': 'application/json' })
      .end(JSON.stringify({ error: 'Not found' }));
  }
}
const server = createServer(async (request, response) => {
  const url = new URL(request.url ?? '/', 'http://' + (request.headers.host ?? '127.0.0.1'));
  const handler = handlers[url.pathname];
  if (handler) {
    try {
      const vercelRequest = request as VercelRequest;
      vercelRequest.query = queryObject(url);
      vercelRequest.cookies = {};
      vercelRequest.body = await readBody(request);
      await handler(vercelRequest, enhanceResponse(response));
    } catch (error) {
      if (!response.headersSent) response.writeHead(500, { 'Content-Type': 'application/json' });
      if (!response.writableEnded)
        response.end(
          JSON.stringify({ error: error instanceof Error ? error.message : 'Local server error' }),
        );
    }
    return;
  }
  await serveStatic(url.pathname, response);
});
const port = Number(process.env.PORT ?? 3000);
server.listen(port, '127.0.0.1', () =>
  console.log('LIA Drive running at http://127.0.0.1:' + port),
);
