import type { Interaction } from 'discord.js';
import { EventEmitter } from 'events';
import type { Context } from 'hono';

export class InteractionHandler extends EventEmitter {
    constructor() {
        super();
    }

    emitInteraction(interaction: Interaction) {
        this.emit('interaction', interaction);
    }

    emitAutocomplete(interaction: Interaction) {
        this.emit('autocomplete', interaction);
    }

    emitButton(interaction: Interaction) {
        this.emit('button', interaction);
    }

    emitSlashCommand(interaction: Interaction) {
        this.emit('slashCommand', interaction);
    }

    reply(c: Context, response: Record<string, unknown>) {
        const interactionId = c.req.header('x-interaction-id');
        const interactionToken = c.req.header('x-interaction-token');

        if (!interactionId || !interactionToken) {
            console.warn('Missing interaction ID or token in headers');
            return c.text('Missing interaction ID or token', 400);
        }

        const type = interactionId ? 4 : 5; // 4 for immediate response, 5 for deferred response
        return c.json({ type, data: response });
    }

    deferReply(c: Context) {
        const interactionId = c.req.header('x-interaction-id');
        const interactionToken = c.req.header('x-interaction-token');

        if (!interactionId || !interactionToken) {
            console.warn('Missing interaction ID or token in headers');
            return c.text('Missing interaction ID or token', 400);
        }

        return c.json({ type: 5 });
    }
}