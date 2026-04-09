import { InteractionType, type Interaction } from 'discord.js';
import { type Context } from 'hono';
import type { InteractionHandler } from '../handler';
import { verifySignature } from '../utils/discordUtils';

export async function handleInteractions(c: Context, emitter: InteractionHandler) {
  const body = await c.req.text();
  const isVerified = await verifySignature(c, body);
  if (!isVerified) {
    return c.text('Invalid signature', 401);
  }

  const rawInteraction = JSON.parse(body);
  if (!rawInteraction || typeof rawInteraction !== 'object' || Array.isArray(rawInteraction) || typeof rawInteraction.type !== 'number') {
    return c.text('Invalid interaction payload', 400);
  }
  const type = rawInteraction.type as InteractionType;
  const interaction: Interaction = JSON.parse(body) as Interaction;

  if (type === InteractionType.Ping) {
    return c.json({ type: 1 });
  }

  if (type === InteractionType.ApplicationCommandAutocomplete) {
    emitter.emitAutocomplete(interaction);
  }

  if (type === InteractionType.ApplicationCommand) {
    emitter.emitSlashCommand(interaction);
  }

  if (type === InteractionType.MessageComponent) {
    emitter.emitButton(interaction);
  }

  return c.json({ error: 'Unknown interaction' }, 400);
}
