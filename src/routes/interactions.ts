import { InteractionType } from 'discord.js';
import { type Context } from 'hono';
import type { InteractionHandler } from '../handler';
import { verifySignature } from '../utils/discordUtils';
import { createInteractionFacade } from '../utils/interactionFacade';

export async function handleInteractions(c: Context, emitter: InteractionHandler) {
  const body = await c.req.text();
  const isVerified = await verifySignature(c, body);
  if (!isVerified) {
    return c.text('Invalid signature', 401);
  }

  const rawInteraction = JSON.parse(body) as Record<string, unknown>;
  if (!rawInteraction || typeof rawInteraction !== 'object' || Array.isArray(rawInteraction) || typeof rawInteraction.type !== 'number') {
    return c.text('Invalid interaction payload', 400);
  }

  const type = rawInteraction.type as InteractionType;
  const interaction = createInteractionFacade(rawInteraction as Parameters<typeof createInteractionFacade>[0]);

  if (type === InteractionType.Ping) {
    return c.json({ type: 1 });
  }

  if (type === InteractionType.ApplicationCommandAutocomplete) {
    await emitter.emitAutocomplete(interaction);
    return c.json(interaction.getResponse() ?? { type: 8, data: { choices: [] } });
  }

  if (type === InteractionType.ApplicationCommand) {
    await emitter.emitSlashCommand(interaction);
    return c.json(interaction.getResponse() ?? { type: 5 });
  }

  if (type === InteractionType.MessageComponent) {
    await emitter.emitButton(interaction);
    return c.json(interaction.getResponse() ?? { type: 6 });
  }

  if (type === InteractionType.ModalSubmit) {
    await emitter.emitInteraction(interaction);
    return c.json(interaction.getResponse() ?? { type: 5 });
  }

  return c.json({ error: 'Unknown interaction' }, 400);
}
