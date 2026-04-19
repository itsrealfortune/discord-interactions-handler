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
 *
 * @example
 * const handler = new InteractionHandler();
 * handler.on("slashCommand", async (interaction) => {
 *   await interaction.reply({ content: "Command received" });
 * });
 */
export class InteractionHandler extends EventEmitter {
	/**
	 * Registers a typed listener for an interaction event.
	 *
	 * @template {InteractionEventName} E Supported event name.
	 * @param {E} event Event name (interaction, slashCommand, button, etc.).
	 * @param {InteractionEventListener<E>} listener Callback invoked with the typed interaction.
	 * @returns {this} Current instance for chaining.
	 * @example
	 * handler.on("button", async (interaction) => {
	 *   await interaction.deferUpdate();
	 * });
	 */
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

	/**
	 * Registers a typed listener that runs once.
	 *
	 * @template {InteractionEventName} E Supported event name.
	 * @param {E} event Event name to listen for.
	 * @param {InteractionEventListener<E>} listener Callback executed once.
	 * @returns {this} Current instance for chaining.
	 * @example
	 * handler.once("modalSubmit", async (interaction) => {
	 *   await interaction.reply({ content: "Modal received" });
	 * });
	 */
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

	/**
	 * Removes a typed listener that was previously registered.
	 *
	 * @template {InteractionEventName} E Supported event name.
	 * @param {E} event Event name.
	 * @param {InteractionEventListener<E>} listener Callback to remove.
	 * @returns {this} Current instance for chaining.
	 * @example
	 * const listener = async (interaction: CommandInteractionLike) => {
	 *   await interaction.reply("ok");
	 * };
	 * handler.on("slashCommand", listener);
	 * handler.off("slashCommand", listener);
	 */
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

	/**
	 * Emits an event to all listeners and waits for completion.
	 *
	 * Listener errors are absorbed with Promise.allSettled so one failing
	 * handler does not break the processing chain.
	 *
	 * @template {InteractionEventName} E Event name to emit.
	 * @param {E} event Event name.
	 * @param {InteractionEventMap[E]} interaction Interaction passed to listeners.
	 * @returns {Promise<void>} Promise resolved when all listeners complete.
	 * @example
	 * await this.emitAsync("interaction", interaction);
	 */
	private async emitAsync<E extends InteractionEventName>(
		event: E,
		interaction: InteractionEventMap[E],
	) {
		const listeners = this.listeners(event);
		await Promise.allSettled(
			listeners.map((listener) => Promise.resolve(listener(interaction))),
		);
	}

	/**
	 * Emits the global event for every non-ping interaction.
	 *
	 * @param {InteractionLike} interaction Interaction to broadcast.
	 * @returns {Promise<void>} Promise resolved after listener execution.
	 * @example
	 * await handler.emitInteraction(interaction);
	 */
	async emitInteraction(interaction: InteractionLike) {
		await this.emitAsync("interaction", interaction);
	}

	/**
	 * Emits the autocomplete event.
	 *
	 * @param {AutocompleteInteractionLike} interaction Autocomplete interaction.
	 * @returns {Promise<void>} Promise resolved after listener execution.
	 * @example
	 * await handler.emitAutocomplete(interaction);
	 */
	async emitAutocomplete(interaction: AutocompleteInteractionLike) {
		await this.emitAsync("autocomplete", interaction);
	}

	/**
	 * Emits the button event for button components.
	 *
	 * @param {ButtonInteractionLike} interaction Button interaction.
	 * @returns {Promise<void>} Promise resolved after listener execution.
	 * @example
	 * await handler.emitButton(interaction);
	 */
	async emitButton(interaction: ButtonInteractionLike) {
		await this.emitAsync("button", interaction);
	}

	/**
	 * Emits the messageComponent event for any message component interaction.
	 *
	 * @param {MessageComponentInteractionLike} interaction Message component interaction.
	 * @returns {Promise<void>} Promise resolved after listener execution.
	 * @example
	 * await handler.emitMessageComponent(interaction);
	 */
	async emitMessageComponent(interaction: MessageComponentInteractionLike) {
		await this.emitAsync("messageComponent", interaction);
	}

	/**
	 * Emits the slashCommand event for application command interactions.
	 *
	 * @param {CommandInteractionLike} interaction Command interaction.
	 * @returns {Promise<void>} Promise resolved after listener execution.
	 * @example
	 * await handler.emitSlashCommand(interaction);
	 */
	async emitSlashCommand(interaction: CommandInteractionLike) {
		await this.emitAsync("slashCommand", interaction);
	}

	/**
	 * Emits the modalSubmit event for modal submit interactions.
	 *
	 * @param {ModalSubmitInteractionLike} interaction Modal submit interaction.
	 * @returns {Promise<void>} Promise resolved after listener execution.
	 * @example
	 * await handler.emitModalSubmit(interaction);
	 */
	async emitModalSubmit(interaction: ModalSubmitInteractionLike) {
		await this.emitAsync("modalSubmit", interaction);
	}

	/**
	 * Emits the selectMenu event for any select menu interaction.
	 *
	 * @param {SelectMenuInteractionLike} interaction Select menu interaction.
	 * @returns {Promise<void>} Promise resolved after listener execution.
	 * @example
	 * await handler.emitSelectMenu(interaction);
	 */
	async emitSelectMenu(interaction: SelectMenuInteractionLike) {
		await this.emitAsync("selectMenu", interaction);
	}

	/**
	 * Legacy HTTP response helper.
	 *
	 * Prefer using the interaction facade methods (reply/deferReply/etc.)
	 * inside listeners when possible.
	 *
	 * @param {Context} c Hono request context.
	 * @param {Record<string, unknown>} response Discord callback data object.
	 * @returns {Response} Hono response in Discord callback format.
	 * @example
	 * return handler.reply(c, { content: "Hello" });
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

	/**
	 * Legacy helper to send a deferred response (type 5).
	 *
	 * @param {Context} c Hono request context.
	 * @returns {Response} Hono response indicating a deferred response.
	 * @example
	 * return handler.deferReply(c);
	 */
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
