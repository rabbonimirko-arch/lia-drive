import { z } from 'zod';
import { authenticate, requireAdmin } from './_lib/auth.js';
import { getConfig } from './_lib/config.js';
import {
  createAvatarEmbed,
  getAvatarConfiguration,
  provisionAvatarContext,
} from './_lib/liveavatar-service.js';
import { parseBody, requireMethod, sendJson, withApi } from './_lib/http.js';
const bodySchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('embed'),
    avatarId: z.string().uuid().optional(),
    contextId: z.string().uuid().optional(),
    voiceId: z.string().uuid().optional(),
    sandbox: z.boolean().optional(),
  }),
  z.object({ action: z.literal('provision-context') }),
]);
export default withApi(
  async (request, response) => {
    requireMethod(request, ['GET', 'POST']);
    if (request.method === 'GET') {
      sendJson(response, 200, getAvatarConfiguration());
      return;
    }
    const body = parseBody(request, bodySchema);
    if (body.action === 'provision-context') {
      requireAdmin(request);
      sendJson(response, 201, await provisionAvatarContext());
      return;
    }
    if (!getConfig().ALLOW_ANONYMOUS_AVATAR) await authenticate(request, true);
    sendJson(response, 201, await createAvatarEmbed(body));
  },
  { rateLimit: 20 },
);
