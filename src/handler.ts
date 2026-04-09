import { EventEmitter } from 'events';
import type { Context } from 'hono';
import type {
    AutocompleteInteractionLike,
    ButtonInteractionLike,
    CommandInteractionLike,
    InteractionEventListener,
    InteractionEventMap,
    InteractionEventName,
    InteractionLike,
    MessageComponentInteractionLike,
    ModalSubmitInteractionLike,
    SelectMenuInteractionLike
} from './types/interaction';

export class InteractionHandler extends EventEmitter {
    constructor() {
        super();
    }

    override on<E extends InteractionEventName>(event: E, listener: InteractionEventListener<E>): this;
    override on(event: string | symbol, listener: (...args: any[]) => void): this {
        return super.on(event, listener);
    }

    override once<E extends InteractionEventName>(event: E, listener: InteractionEventListener<E>): this;
    override once(event: string | symbol, listener: (...args: any[]) => void): this {
        return super.once(event, listener);
    }

    override off<E extends InteractionEventName>(event: E, listener: InteractionEventListener<E>): this;
    override off(event: string | symbol, listener: (...args: any[]) => void): this {
        return super.off(event, listener);
    }

    private async emitAsync<E extends InteractionEventName>(event: E, interaction: InteractionEventMap[E]) {
        const listeners = this.listeners(event);
        await Promise.allSettled(listeners.map((listener) => Promise.resolve(listener(interaction))));
    }

    async emitInteraction(interaction: InteractionLike) {
        await this.emitAsync('interaction', interaction);
    }

    async emitAutocomplete(interaction: AutocompleteInteractionLike) {
        await this.emitAsync('autocomplete', interaction);
    }

    async emitButton(interaction: ButtonInteractionLike) {
        await this.emitAsync('button', interaction);
    }

    async emitMessageComponent(interaction: MessageComponentInteractionLike) {
        await this.emitAsync('messageComponent', interaction);
    }

    async emitSlashCommand(interaction: CommandInteractionLike) {
        await this.emitAsync('slashCommand', interaction);
    }

    async emitModalSubmit(interaction: ModalSubmitInteractionLike) {
        await this.emitAsync('modalSubmit', interaction);
    }

    async emitSelectMenu(interaction: SelectMenuInteractionLike) {
        await this.emitAsync('selectMenu', interaction);
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