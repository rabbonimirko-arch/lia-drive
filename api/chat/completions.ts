import OpenAI from 'openai';
import { authenticate } from '../_lib/auth';
import { buildAiSystemContext } from '../_lib/ai-context';
import { getConfig } from '../_lib/config';
import { ApiError } from '../_lib/errors';
import { parseBody, requireMethod, sendJson, withApi } from '../_lib/http';
import { chatBodySchema, preferencesSchema } from '../_lib/schemas';
import { defaultPreferences } from '../_lib/preferences-service';
function hasGatewayAccess(request: import('../_lib/vercel-types').VercelRequest): boolean {
  const secret = getConfig().AI_GATEWAY_SECRET;
  if (!secret) return true;
  const bearer = request.headers.authorization?.replace(/^Bearers+/i, '');
  return request.headers['x-lia-api-key'] === secret || bearer === secret;
}
export default withApi(
  async (request, response) => {
    requireMethod(request, ['POST']);
    const config = getConfig();
    if (!config.OPENAI_API_KEY)
      throw new ApiError(503, 'OPENAI_API_KEY is not configured', 'openai_not_configured');
    if (!hasGatewayAccess(request)) await authenticate(request, true);
    const body = parseBody(request, chatBodySchema);
    const coordinates = body.location ?? { lat: 41.9028, lon: 12.4964 };
    const preferences = preferencesSchema.parse({ ...defaultPreferences, ...body.preferences });
    const contextualSystemMessage = await buildAiSystemContext(coordinates, preferences);
    const client = new OpenAI({ apiKey: config.OPENAI_API_KEY });
    const completion = await client.chat.completions.create({
      model: body.model ?? config.OPENAI_MODEL,
      messages: [{ role: 'system', content: contextualSystemMessage }, ...body.messages] as any,
      temperature: body.temperature,
      max_completion_tokens: body.max_completion_tokens ?? body.max_tokens,
      stream: false,
    });
    sendJson(response, 200, completion);
  },
  { rateLimit: 20, rateWindowSeconds: 60 },
);
