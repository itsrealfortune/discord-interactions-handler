import type { Context } from "hono";
import { EventEmitter } from "node:events";
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
	SelectMenuInteractionLike,
} from "./types/interaction";

/**
 * Typed event bus for incoming Discord interactions.
 *
 * Use on/once/off with event names from InteractionEventMap to get
 * strongly typed interaction objects in listeners.
 */
export class InteractionHandler extends EventEmitter {
	/** Register a typed listener for a known interaction event. */
	override on<E extends InteractionEventName>(
		event: E,
		listener: InteractionEventListener<E>,
	): this;
	override on(
		event: string | symbol,
		listener: (...args: unknown[]) => void,
	): this {
		return super.on(event, listener);
	}

	/** Register a one-time typed listener for a known interaction event. */
	override once<E extends InteractionEventName>(
		event: E,
		listener: InteractionEventListener<E>,
	): this;
	override once(
		event: string | symbol,
		listener: (...args: unknown[]) => void,
	): this {
		return super.once(event, listener);
	}

	/** Remove a typed listener previously registered with on/once. */
	override off<E extends InteractionEventName>(
		event: E,
		listener: InteractionEventListener<E>,
	): this;
	override off(
		event: string | symbol,
		listener: (...args: unknown[]) => void,
	): this {
		return super.off(event, listener);
	}

	private async emitAsync<E extends InteractionEventName>(
		event: E,
		interaction: InteractionEventMap[E],
	) {
		const listeners = this.listeners(event);
		await Promise.allSettled(
			listeners.map((listener) => Promise.resolve(listener(interaction))),
		);
	}

	/** Emit for every non-ping interaction. */
	async emitInteraction(interaction: InteractionLike) {
		await this.emitAsync("interaction", interaction);
	}

	/** Emit for autocomplete interactions only. */
	async emitAutocomplete(interaction: AutocompleteInteractionLike) {
		await this.emitAsync("autocomplete", interaction);
	}

	/** Emit for button component interactions only. */
	async emitButton(interaction: ButtonInteractionLike) {
		await this.emitAsync("button", interaction);
	}

	/** Emit for any message component interaction. */
	async emitMessageComponent(interaction: MessageComponentInteractionLike) {
		await this.emitAsync("messageComponent", interaction);
	}

	/** Emit for slash and context command interactions. */
	async emitSlashCommand(interaction: CommandInteractionLike) {
		await this.emitAsync("slashCommand", interaction);
	}

	/** Emit for modal submit interactions only. */
	async emitModalSubmit(interaction: ModalSubmitInteractionLike) {
		await this.emitAsync("modalSubmit", interaction);
	}

	/** Emit for any select menu interaction. */
	async emitSelectMenu(interaction: SelectMenuInteractionLike) {
		await this.emitAsync("selectMenu", interaction);
	}

	/**
	 * Legacy HTTP response helper.
	 *
	 * Prefer using the interaction facade methods (reply/deferReply/etc.)
	 * inside listeners when possible.
	 */
	reply(c: Context, response: Record<string, unknown>) {
		const interactionId = c.req.header("x-interaction-id");
		const interactionToken = c.req.header("x-interaction-token");

		if (!interactionId || !interactionToken) {
			console.warn("Missing interaction ID or token in headers");
			return c.text("Missing interaction ID or token", 400);
		}

		const type = interactionId ? 4 : 5; // 4 for immediate response, 5 for deferred response
		return c.json({ type, data: response });
	}

	/** Legacy deferred response helper (type 5). */
	deferReply(c: Context) {
		const interactionId = c.req.header("x-interaction-id");
		const interactionToken = c.req.header("x-interaction-token");

		if (!interactionId || !interactionToken) {
			console.warn("Missing interaction ID or token in headers");
			return c.text("Missing interaction ID or token", 400);
		}

		return c.json({ type: 5 });
	}
}
