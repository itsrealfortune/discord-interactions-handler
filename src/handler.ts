import { EventEmitter } from 'events';
import type { Context } from 'hono';
import type { InteractionLike } from './utils/interactionFacade';

export class InteractionHandler extends EventEmitter {
    constructor() {
        super();
    }

    private async emitAsync(event: string, interaction: InteractionLike) {
        const listeners = this.listeners(event);
        await Promise.allSettled(listeners.map((listener) => Promise.resolve(listener(interaction))));
    }

    async emitInteraction(interaction: InteractionLike) {
        await this.emitAsync('interaction', interaction);
    }

    async emitAutocomplete(interaction: InteractionLike) {
        await this.emitAsync('autocomplete', interaction);
    }

    async emitButton(interaction: InteractionLike) {
        await this.emitAsync('button', interaction);
    }

    async emitSlashCommand(interaction: InteractionLike) {
        await this.emitAsync('slashCommand', interaction);
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