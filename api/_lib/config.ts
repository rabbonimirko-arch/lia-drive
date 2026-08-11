import { z } from 'zod';

const booleanString = z
  .string()
  .optional()
  .transform((value) => value?.toLowerCase() === 'true');
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  APP_BASE_URL: z.string().url().default('http://localhost:3000'),
  ALLOWED_ORIGINS: z.string().default('http://localhost:3000'),
  CRON_SECRET: z.string().min(16).optional(),
  ADMIN_API_KEY: z.string().min(16).optional(),
  JWT_SECRET: z.string().min(32).optional(),
  SUPABASE_URL: z.string().url().optional(),
  SUPABASE_PUBLISHABLE_KEY: z.string().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_MODEL: z.string().default('gpt-5-mini'),
  AI_GATEWAY_SECRET: z.string().optional(),
  LIVEAVATAR_API_KEY: z.string().optional(),
  LIVEAVATAR_AVATAR_ID: z.string().uuid().optional(),
  LIVEAVATAR_CONTEXT_ID: z.string().uuid().optional(),
  LIVEAVATAR_VOICE_ID: z.string().uuid().optional(),
  LIVEAVATAR_EMBED_URL: z
    .string()
    .url()
    .default(
      'https://embed.liveavatar.com/v1/1d4a2b6c-8e2f-4206-9e52-bc5277377281?9?background=000000',
    ),
  LIVEAVATAR_SANDBOX: booleanString,
  ALLOW_ANONYMOUS_AVATAR: booleanString,
  TOMTOM_API_KEY: z.string().optional(),
});
export type AppConfig = z.infer<typeof envSchema>;
let memoizedConfig: AppConfig | undefined;
export function getConfig(): AppConfig {
  if (memoizedConfig) return memoizedConfig;
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const details = parsed.error.issues
      .map((issue) => issue.path.join('.') + ': ' + issue.message)
      .join('; ');
    throw new Error('Invalid environment configuration: ' + details);
  }
  memoizedConfig = parsed.data;
  return memoizedConfig;
}
export function resetConfigForTests(): void {
  memoizedConfig = undefined;
}
export function hasSupabaseAdminConfig(): boolean {
  const config = getConfig();
  return Boolean(config.SUPABASE_URL && config.SUPABASE_SERVICE_ROLE_KEY);
}
