import type {
	ApplicationCommandOptionChoiceData,
	ApplicationCommandType,
	ComponentType,
	InteractionDeferReplyOptions,
	InteractionReplyOptions,
	InteractionType,
	InteractionUpdateOptions,
} from "discord.js";

/**
 * Runtime type contracts for Discord interactions handled through webhooks.
 *
 * @example
 * import type { InteractionLike, InteractionEventMap } from "./types/interaction";
 */

/** Generic JSON-like object used for Discord payload fragments. */
export type UnknownRecord = Record<string, unknown>;

/**
 * Partial shape of interaction.data from Discord webhooks.
 *
 * Only commonly used fields are explicitly modeled here.
 * Unknown fields are preserved through the index signature.
 *
 * @example
 * const data: InteractionData = {
 *   name: "ping",
 *   options: [{ name: "target", value: "world" }],
 * };
 */
export type InteractionData = {
	type?: number;
	component_type?: number;
	name?: string;
	custom_id?: string;
	values?: string[];
	options?: UnknownRecord[];
	[key: string]: unknown;
};

/**
 * Raw Discord payload received on the HTTP endpoint.
 *
 * @example
 * const raw: RawInteraction = { type: 2, id: "123", token: "abc" };
 */
export type RawInteraction = {
	id?: string;
	token?: string;
	application_id?: string;
	type: InteractionType;
	guild_id?: string;
	channel_id?: string;
	member?: UnknownRecord;
	user?: UnknownRecord;
	locale?: string;
	guild_locale?: string;
	data?: InteractionData;
	[key: string]: unknown;
};

/**
 * Callback response shape expected by Discord.
 *
 * @example
 * const response: InteractionCallbackResponse = {
 *   type: 4,
 *   data: { content: "Hello" },
 * };
 */
export type InteractionCallbackResponse = {
	type: number;
	data?: UnknownRecord;
};

/**
 * Supported select menu component types.
 *
 * @example
 * const selectType: SelectComponentType = ComponentType.StringSelect;
 */
export type SelectComponentType =
	| ComponentType.StringSelect
	| ComponentType.UserSelect
	| ComponentType.RoleSelect
	| ComponentType.MentionableSelect
	| ComponentType.ChannelSelect;

/**
 * Runtime-friendly interaction facade used by handlers.
 *
 * This approximates useful discord.js interaction APIs while remaining
 * compatible with raw webhook payloads.
 */
export interface InteractionLike extends RawInteraction {
	/** Normalized guild id from guild_id. */
	guildId: string | null;
	/** Normalized channel id from channel_id. */
	channelId: string | null;
	/** Normalized application id from application_id. */
	applicationId: string | null;
	/** User id extracted from member.user.id or user.id. */
	userId: string | null;
	/** Command name when interaction.data.name is present. */
	commandName: string | null;
	/** Custom id for component/modal interactions when available. */
	customId: string | null;
	/** Component type value from interaction.data.component_type. */
	componentType: number | null;
	/** Component selected values when interaction.data.values is present. */
	values: string[];
	/** Timestamp extracted from interaction snowflake id. */
	createdTimestamp: number | null;
	/** Date derived from createdTimestamp. */
	createdAt: Date | null;
	/** Whether an immediate response has been produced. */
	replied: boolean;
	/** Whether a deferred response has been produced. */
	deferred: boolean;
	/** Whether the response is ephemeral (flags = 64). */
	ephemeral: boolean;
	/** True for interaction kinds that can receive a callback response. */
	isRepliable: () => boolean;
	/** True when interaction belongs to a guild context. */
	inGuild: () => boolean;
	/** Placeholder equivalent of discord.js cached guild check. */
	inCachedGuild: () => boolean;
	/** Raw payload guild check helper. */
	inRawGuild: () => boolean;
	/** Type guard for application command interactions. */
	isCommand: () => this is CommandInteractionLike;
	/** Type guard for autocomplete interactions. */
	isAutocomplete: () => this is AutocompleteInteractionLike;
	/** Type guard for chat input command interactions. */
	isChatInputCommand: () => this is ChatInputCommandLike;
	/** Type guard for message/user context command interactions. */
	isContextMenuCommand: () => this is ContextMenuCommandLike;
	/** Type guard for user context command interactions. */
	isUserContextMenuCommand: () => this is UserContextMenuCommandLike;
	/** Type guard for message context command interactions. */
	isMessageContextMenuCommand: () => this is MessageContextMenuCommandLike;
	/** Type guard for all message component interactions. */
	isMessageComponent: () => this is MessageComponentInteractionLike;
	/** Type guard for button component interactions. */
	isButton: () => this is ButtonInteractionLike;
	/** Type guard for any select menu component interaction. */
	isSelectMenu: () => this is SelectMenuInteractionLike;
	/** Alias of isSelectMenu for discord.js API compatibility. */
	isAnySelectMenu: () => this is SelectMenuInteractionLike;
	/** Type guard for string select menu interactions. */
	isStringSelectMenu: () => this is StringSelectMenuInteractionLike;
	/** Type guard for user select menu interactions. */
	isUserSelectMenu: () => this is UserSelectMenuInteractionLike;
	/** Type guard for role select menu interactions. */
	isRoleSelectMenu: () => this is RoleSelectMenuInteractionLike;
	/** Type guard for mentionable select menu interactions. */
	isMentionableSelectMenu: () => this is MentionableSelectMenuInteractionLike;
	/** Type guard for channel select menu interactions. */
	isChannelSelectMenu: () => this is ChannelSelectMenuInteractionLike;
	/** Type guard for modal submit interactions. */
	isModalSubmit: () => this is ModalSubmitInteractionLike;
	/** Build an immediate callback response (type 4). */
	reply: (
		payload: string | InteractionReplyOptions,
	) => Promise<InteractionCallbackResponse>;
	/** Build a deferred callback response (type 5). */
	deferReply: (
		options?: InteractionDeferReplyOptions,
	) => Promise<InteractionCallbackResponse>;
	/** Build a deferred message update response (type 6). */
	deferUpdate: () => Promise<InteractionCallbackResponse>;
	/** Build an update message callback response (type 7). */
	update: (
		payload: string | InteractionUpdateOptions,
	) => Promise<InteractionCallbackResponse>;
	/** Build an autocomplete callback response (type 8). */
	respond: (
		choices: readonly ApplicationCommandOptionChoiceData[],
	) => Promise<InteractionCallbackResponse>;
	/** Build a show modal callback response (type 9). */
	showModal: (payload: UnknownRecord) => Promise<InteractionCallbackResponse>;
	/** Edit the currently captured callback payload. */
	editReply: (
		payload: string | InteractionReplyOptions,
	) => Promise<InteractionCallbackResponse>;
	/** Replace captured callback payload as an additional message-like response. */
	followUp: (
		payload: string | InteractionReplyOptions,
	) => Promise<InteractionCallbackResponse>;
	/** Read currently captured response data. */
	fetchReply: () => Promise<UnknownRecord>;
	/** Reset captured interaction response state. */
	deleteReply: () => Promise<void>;
	/** Return the raw callback payload that should be sent over HTTP. */
	getResponse: () => InteractionCallbackResponse | null;
}

/** Application command interaction facade. */
export interface CommandInteractionLike extends InteractionLike {
	type: InteractionType.ApplicationCommand;
}

/** Autocomplete interaction facade. */
export interface AutocompleteInteractionLike extends InteractionLike {
	type: InteractionType.ApplicationCommandAutocomplete;
}

/** Chat input command interaction facade. */
export interface ChatInputCommandLike extends CommandInteractionLike {
	data?: InteractionData & { type: ApplicationCommandType.ChatInput };
}

/** User/message context command interaction facade. */
export interface ContextMenuCommandLike extends CommandInteractionLike {
	data?: InteractionData & {
		type: ApplicationCommandType.Message | ApplicationCommandType.User;
	};
}

/** User context command interaction facade. */
export interface UserContextMenuCommandLike extends CommandInteractionLike {
	data?: InteractionData & { type: ApplicationCommandType.User };
}

/** Message context command interaction facade. */
export interface MessageContextMenuCommandLike extends CommandInteractionLike {
	data?: InteractionData & { type: ApplicationCommandType.Message };
}

/** Message component interaction facade. */
export interface MessageComponentInteractionLike extends InteractionLike {
	type: InteractionType.MessageComponent;
}

/** Button interaction facade. */
export interface ButtonInteractionLike extends MessageComponentInteractionLike {
	data?: InteractionData & { component_type: ComponentType.Button };
}

/** Select menu interaction facade. */
export interface SelectMenuInteractionLike
	extends MessageComponentInteractionLike {
	data?: InteractionData & {
		component_type: SelectComponentType;
	};
}

/** String select menu interaction facade. */
export interface StringSelectMenuInteractionLike
	extends MessageComponentInteractionLike {
	data?: InteractionData & { component_type: ComponentType.StringSelect };
}

/** User select menu interaction facade. */
export interface UserSelectMenuInteractionLike
	extends MessageComponentInteractionLike {
	data?: InteractionData & { component_type: ComponentType.UserSelect };
}

/** Role select menu interaction facade. */
export interface RoleSelectMenuInteractionLike
	extends MessageComponentInteractionLike {
	data?: InteractionData & { component_type: ComponentType.RoleSelect };
}

/** Mentionable select menu interaction facade. */
export interface MentionableSelectMenuInteractionLike
	extends MessageComponentInteractionLike {
	data?: InteractionData & { component_type: ComponentType.MentionableSelect };
}

/** Channel select menu interaction facade. */
export interface ChannelSelectMenuInteractionLike
	extends MessageComponentInteractionLike {
	data?: InteractionData & { component_type: ComponentType.ChannelSelect };
}

/** Modal submit interaction facade. */
export interface ModalSubmitInteractionLike extends InteractionLike {
	type: InteractionType.ModalSubmit;
}

/**
 * Event-to-interaction mapping used by InteractionHandler.
 *
 * This powers strongly typed on/once/off listeners.
 */
export type InteractionEventMap = {
	interaction: InteractionLike;
	autocomplete: AutocompleteInteractionLike;
	slashCommand: CommandInteractionLike;
	button: ButtonInteractionLike;
	messageComponent: MessageComponentInteractionLike;
	modalSubmit: ModalSubmitInteractionLike;
	selectMenu: SelectMenuInteractionLike;
};

/**
 * Event names accepted by InteractionHandler.
 *
 * @example
 * const eventName: InteractionEventName = "slashCommand";
 */
export type InteractionEventName = keyof InteractionEventMap;
/**
 * Strongly typed listener signature for a given interaction event.
 *
 * @template {InteractionEventName} E Event name.
 * @param {InteractionEventMap[E]} interaction Typed interaction associated with the event.
 * @returns {void | Promise<void>} Nothing or a promise resolved when handling completes.
 * @example
 * const onAnyInteraction: InteractionEventListener<"interaction"> = async (interaction) => {
 *   if (interaction.isRepliable()) {
 *     await interaction.deferReply();
 *   }
 * };
 */
export type InteractionEventListener<E extends InteractionEventName> = (
	interaction: InteractionEventMap[E],
) => void | Promise<void>;
