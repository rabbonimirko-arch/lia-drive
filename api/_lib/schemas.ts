import { z } from 'zod';
export const coordinatesSchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lon: z.coerce.number().min(-180).max(180),
  force: z.enum(['true', 'false']).optional(),
});
export const preferencesSchema = z.object({
  language: z.string().min(2).max(8).default('it'),
  units: z.literal('metric').default('metric'),
  interests: z.array(z.string().min(1).max(50)).max(20).default(['viaggi', 'storia', 'cultura']),
  newsTopics: z.array(z.string().min(1).max(60)).max(20).default(['mobilità', 'territorio']),
  accessibilityMode: z.boolean().default(false),
  avatarEnabled: z.boolean().default(true),
});
export const gpsBodySchema = z.object({
  lat: z.number().min(-90).max(90),
  lon: z.number().min(-180).max(180),
  accuracyMeters: z.number().nonnegative().max(100000).optional(),
  altitudeMeters: z.number().min(-500).max(10000).optional(),
  headingDegrees: z.number().min(0).max(360).optional(),
  speedMps: z.number().nonnegative().max(300).optional(),
  recordedAt: z.iso.datetime().optional(),
});
export const chatBodySchema = z.object({
  model: z.string().optional(),
  messages: z
    .array(
      z.object({
        role: z.enum(['system', 'user', 'assistant', 'developer']),
        content: z.string().min(1).max(20000),
      }),
    )
    .min(1)
    .max(50),
  temperature: z.number().min(0).max(2).optional(),
  max_tokens: z.number().int().positive().max(8000).optional(),
  max_completion_tokens: z.number().int().positive().max(8000).optional(),
  stream: z.literal(false).optional(),
  location: z
    .object({ lat: z.number().min(-90).max(90), lon: z.number().min(-180).max(180) })
    .optional(),
  preferences: preferencesSchema.partial().optional(),
});
