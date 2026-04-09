import * as hono_types from 'hono/types';
import * as hono from 'hono';
import { Context, Hono } from 'hono';
import * as hono_utils_http_status from 'hono/utils/http-status';
import * as hono_utils_types from 'hono/utils/types';
import { EventEmitter } from 'events';
import { InteractionType, ApplicationCommandType, ComponentType, InteractionReplyOptions, InteractionDeferReplyOptions, InteractionUpdateOptions, ApplicationCommandOptionChoiceData } from 'discord.js';

/** Generic JSON-like object used for Discord payload fragments. */
type UnknownRecord = Record<string, unknown>;
/**
 * Partial shape of interaction.data from Discord webhooks.
 *
 * Only commonly used fields are explicitly modeled here.
 * Unknown fields are preserved through the index signature.
 */
type InteractionData = {
    type?: number;
    component_type?: number;
    name?: string;
    custom_id?: string;
    values?: string[];
    options?: UnknownRecord[];
    [key: string]: unknown;
};
/** Raw Discord interaction payload received on the HTTP endpoint. */
type RawInteraction = {
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
/** Discord callback response shape returned to the interaction endpoint. */
type InteractionCallbackResponse = {
    type: number;
    data?: UnknownRecord;
};
/** Select menu component types supported by message component interactions. */
type SelectComponentType = ComponentType.StringSelect | ComponentType.UserSelect | ComponentType.RoleSelect | ComponentType.MentionableSelect | ComponentType.ChannelSelect;
/**
 * Runtime-friendly interaction facade used by handlers.
 *
 * This approximates useful discord.js interaction APIs while remaining
 * compatible with raw webhook payloads.
 */
interface InteractionLike extends RawInteraction {
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
    reply: (payload: string | InteractionReplyOptions) => Promise<InteractionCallbackResponse>;
    /** Build a deferred callback response (type 5). */
    deferReply: (options?: InteractionDeferReplyOptions) => Promise<InteractionCallbackResponse>;
    /** Build a deferred message update response (type 6). */
    deferUpdate: () => Promise<InteractionCallbackResponse>;
    /** Build an update message callback response (type 7). */
    update: (payload: string | InteractionUpdateOptions) => Promise<InteractionCallbackResponse>;
    /** Build an autocomplete callback response (type 8). */
    respond: (choices: readonly ApplicationCommandOptionChoiceData[]) => Promise<InteractionCallbackResponse>;
    /** Build a show modal callback response (type 9). */
    showModal: (payload: UnknownRecord) => Promise<InteractionCallbackResponse>;
    /** Edit the currently captured callback payload. */
    editReply: (payload: string | InteractionReplyOptions) => Promise<InteractionCallbackResponse>;
    /** Replace captured callback payload as an additional message-like response. */
    followUp: (payload: string | InteractionReplyOptions) => Promise<InteractionCallbackResponse>;
    /** Read currently captured response data. */
    fetchReply: () => Promise<UnknownRecord>;
    /** Reset captured interaction response state. */
    deleteReply: () => Promise<void>;
    /** Return the raw callback payload that should be sent over HTTP. */
    getResponse: () => InteractionCallbackResponse | null;
}
/** Application command interaction facade. */
interface CommandInteractionLike extends InteractionLike {
    type: InteractionType.ApplicationCommand;
}
/** Autocomplete interaction facade. */
interface AutocompleteInteractionLike extends InteractionLike {
    type: InteractionType.ApplicationCommandAutocomplete;
}
/** Chat input command interaction facade. */
interface ChatInputCommandLike extends CommandInteractionLike {
    data?: InteractionData & {
        type: ApplicationCommandType.ChatInput;
    };
}
/** User/message context command interaction facade. */
interface ContextMenuCommandLike extends CommandInteractionLike {
    data?: InteractionData & {
        type: ApplicationCommandType.Message | ApplicationCommandType.User;
    };
}
/** User context command interaction facade. */
interface UserContextMenuCommandLike extends CommandInteractionLike {
    data?: InteractionData & {
        type: ApplicationCommandType.User;
    };
}
/** Message context command interaction facade. */
interface MessageContextMenuCommandLike extends CommandInteractionLike {
    data?: InteractionData & {
        type: ApplicationCommandType.Message;
    };
}
/** Message component interaction facade. */
interface MessageComponentInteractionLike extends InteractionLike {
    type: InteractionType.MessageComponent;
}
/** Button interaction facade. */
interface ButtonInteractionLike extends MessageComponentInteractionLike {
    data?: InteractionData & {
        component_type: ComponentType.Button;
    };
}
/** Select menu interaction facade. */
interface SelectMenuInteractionLike extends MessageComponentInteractionLike {
    data?: InteractionData & {
        component_type: SelectComponentType;
    };
}
/** String select menu interaction facade. */
interface StringSelectMenuInteractionLike extends MessageComponentInteractionLike {
    data?: InteractionData & {
        component_type: ComponentType.StringSelect;
    };
}
/** User select menu interaction facade. */
interface UserSelectMenuInteractionLike extends MessageComponentInteractionLike {
    data?: InteractionData & {
        component_type: ComponentType.UserSelect;
    };
}
/** Role select menu interaction facade. */
interface RoleSelectMenuInteractionLike extends MessageComponentInteractionLike {
    data?: InteractionData & {
        component_type: ComponentType.RoleSelect;
    };
}
/** Mentionable select menu interaction facade. */
interface MentionableSelectMenuInteractionLike extends MessageComponentInteractionLike {
    data?: InteractionData & {
        component_type: ComponentType.MentionableSelect;
    };
}
/** Channel select menu interaction facade. */
interface ChannelSelectMenuInteractionLike extends MessageComponentInteractionLike {
    data?: InteractionData & {
        component_type: ComponentType.ChannelSelect;
    };
}
/** Modal submit interaction facade. */
interface ModalSubmitInteractionLike extends InteractionLike {
    type: InteractionType.ModalSubmit;
}
/**
 * Event-to-interaction mapping used by InteractionHandler.
 *
 * This powers strongly typed on/once/off listeners.
 */
type InteractionEventMap = {
    interaction: InteractionLike;
    autocomplete: AutocompleteInteractionLike;
    slashCommand: CommandInteractionLike;
    button: ButtonInteractionLike;
    messageComponent: MessageComponentInteractionLike;
    modalSubmit: ModalSubmitInteractionLike;
    selectMenu: SelectMenuInteractionLike;
};
/** Event names supported by InteractionHandler listeners. */
type InteractionEventName = keyof InteractionEventMap;
/** Strongly typed listener signature for a given interaction event. */
type InteractionEventListener<E extends InteractionEventName> = (interaction: InteractionEventMap[E]) => void | Promise<void>;

/**
 * Typed event bus for incoming Discord interactions.
 *
 * Use on/once/off with event names from InteractionEventMap to get
 * strongly typed interaction objects in listeners.
 */
declare class InteractionHandler extends EventEmitter {
    constructor();
    /** Register a typed listener for a known interaction event. */
    on<E extends InteractionEventName>(event: E, listener: InteractionEventListener<E>): this;
    /** Register a one-time typed listener for a known interaction event. */
    once<E extends InteractionEventName>(event: E, listener: InteractionEventListener<E>): this;
    /** Remove a typed listener previously registered with on/once. */
    off<E extends InteractionEventName>(event: E, listener: InteractionEventListener<E>): this;
    private emitAsync;
    /** Emit for every non-ping interaction. */
    emitInteraction(interaction: InteractionLike): Promise<void>;
    /** Emit for autocomplete interactions only. */
    emitAutocomplete(interaction: AutocompleteInteractionLike): Promise<void>;
    /** Emit for button component interactions only. */
    emitButton(interaction: ButtonInteractionLike): Promise<void>;
    /** Emit for any message component interaction. */
    emitMessageComponent(interaction: MessageComponentInteractionLike): Promise<void>;
    /** Emit for slash and context command interactions. */
    emitSlashCommand(interaction: CommandInteractionLike): Promise<void>;
    /** Emit for modal submit interactions only. */
    emitModalSubmit(interaction: ModalSubmitInteractionLike): Promise<void>;
    /** Emit for any select menu interaction. */
    emitSelectMenu(interaction: SelectMenuInteractionLike): Promise<void>;
    /**
     * Legacy HTTP response helper.
     *
     * Prefer using the interaction facade methods (reply/deferReply/etc.)
     * inside listeners when possible.
     */
    reply(c: Context, response: Record<string, unknown>): (Response & hono.TypedResponse<"Missing interaction ID or token", 400, "text">) | (Response & hono.TypedResponse<{
        type: number;
        data: {
            [x: string]: hono_utils_types.JSONValue;
        };
    }, hono_utils_http_status.ContentfulStatusCode, "json">);
    /** Legacy deferred response helper (type 5). */
    deferReply(c: Context): (Response & hono.TypedResponse<"Missing interaction ID or token", 400, "text">) | (Response & hono.TypedResponse<{
        type: number;
    }, hono_utils_http_status.ContentfulStatusCode, "json">);
}

declare const _default: {
    app: Hono<hono_types.BlankEnv, hono_types.BlankSchema, "/">;
    client: InteractionHandler;
};

export { _default as default };
