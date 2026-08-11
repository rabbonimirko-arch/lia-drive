import { getSupabaseAdmin } from './supabase.js';
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';
interface LogRecord {
  level: LogLevel;
  message: string;
  service?: string;
  requestId?: string;
  metadata?: Record<string, unknown>;
  error?: unknown;
}
function serializeError(error: unknown): Record<string, unknown> | undefined {
  if (!error) return undefined;
  if (error instanceof Error)
    return { name: error.name, message: error.message, stack: error.stack };
  return { value: String(error) };
}
export function log(record: LogRecord): void {
  const entry = {
    timestamp: new Date().toISOString(),
    level: record.level,
    message: record.message,
    service: record.service ?? 'api',
    requestId: record.requestId,
    metadata: record.metadata,
    error: serializeError(record.error),
  };
  const writer =
    record.level === 'error' ? console.error : record.level === 'warn' ? console.warn : console.log;
  writer(JSON.stringify(entry));
  const supabase = getSupabaseAdmin();
  if (supabase && record.level !== 'debug')
    void supabase
      .from('service_logs')
      .insert({
        level: record.level,
        service: entry.service,
        message: record.message,
        request_id: record.requestId ?? null,
        metadata: { ...record.metadata, error: entry.error },
      })
      .then(({ error }) => {
        if (error)
          console.warn(
            JSON.stringify({
              level: 'warn',
              message: 'Failed to persist log',
              error: error.message,
            }),
          );
      });
}
