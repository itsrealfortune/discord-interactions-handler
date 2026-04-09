import {
    ApplicationCommandType,
    ComponentType,
    InteractionType,
    type ApplicationCommandOptionChoiceData,
    type InteractionDeferReplyOptions,
    type InteractionReplyOptions,
    type InteractionUpdateOptions
} from 'discord.js';

type UnknownRecord = Record<string, unknown>;

type InteractionData = {
  type?: number;
  component_type?: number;
  [key: string]: unknown;
};

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

export type InteractionCallbackResponse = {
  type: number;
  data?: UnknownRecord;
};

type SelectComponentType =
  | ComponentType.StringSelect
  | ComponentType.UserSelect
  | ComponentType.RoleSelect
  | ComponentType.MentionableSelect
  | ComponentType.ChannelSelect;

export interface InteractionLike extends RawInteraction {
  guildId: string | null;
  channelId: string | null;
  applicationId: string | null;
  replied: boolean;
  deferred: boolean;
  ephemeral: boolean;
  isRepliable: () => boolean;
  inGuild: () => boolean;
  inCachedGuild: () => boolean;
  inRawGuild: () => boolean;
  isCommand: () => this is CommandInteractionLike;
  isAutocomplete: () => this is AutocompleteInteractionLike;
  isChatInputCommand: () => this is ChatInputCommandLike;
  isContextMenuCommand: () => this is ContextMenuCommandLike;
  isUserContextMenuCommand: () => this is UserContextMenuCommandLike;
  isMessageContextMenuCommand: () => this is MessageContextMenuCommandLike;
  isMessageComponent: () => this is MessageComponentInteractionLike;
  isButton: () => this is ButtonInteractionLike;
  isSelectMenu: () => this is SelectMenuInteractionLike;
  isAnySelectMenu: () => this is SelectMenuInteractionLike;
  isStringSelectMenu: () => this is StringSelectMenuInteractionLike;
  isUserSelectMenu: () => this is UserSelectMenuInteractionLike;
  isRoleSelectMenu: () => this is RoleSelectMenuInteractionLike;
  isMentionableSelectMenu: () => this is MentionableSelectMenuInteractionLike;
  isChannelSelectMenu: () => this is ChannelSelectMenuInteractionLike;
  isModalSubmit: () => this is ModalSubmitInteractionLike;
  reply: (payload: string | InteractionReplyOptions) => Promise<InteractionCallbackResponse>;
  deferReply: (options?: InteractionDeferReplyOptions) => Promise<InteractionCallbackResponse>;
  deferUpdate: () => Promise<InteractionCallbackResponse>;
  update: (payload: string | InteractionUpdateOptions) => Promise<InteractionCallbackResponse>;
  respond: (choices: readonly ApplicationCommandOptionChoiceData[]) => Promise<InteractionCallbackResponse>;
  showModal: (payload: UnknownRecord) => Promise<InteractionCallbackResponse>;
  editReply: (payload: string | InteractionReplyOptions) => Promise<InteractionCallbackResponse>;
  followUp: (payload: string | InteractionReplyOptions) => Promise<InteractionCallbackResponse>;
  fetchReply: () => Promise<UnknownRecord>;
  deleteReply: () => Promise<void>;
  getResponse: () => InteractionCallbackResponse | null;
}

export interface CommandInteractionLike extends InteractionLike {
  type: InteractionType.ApplicationCommand;
}

export interface AutocompleteInteractionLike extends InteractionLike {
  type: InteractionType.ApplicationCommandAutocomplete;
}

export interface ChatInputCommandLike extends CommandInteractionLike {
  data?: InteractionData & { type: ApplicationCommandType.ChatInput };
}

export interface ContextMenuCommandLike extends CommandInteractionLike {
  data?: InteractionData & { type: ApplicationCommandType.Message | ApplicationCommandType.User };
}

export interface UserContextMenuCommandLike extends CommandInteractionLike {
  data?: InteractionData & { type: ApplicationCommandType.User };
}

export interface MessageContextMenuCommandLike extends CommandInteractionLike {
  data?: InteractionData & { type: ApplicationCommandType.Message };
}

export interface MessageComponentInteractionLike extends InteractionLike {
  type: InteractionType.MessageComponent;
}

export interface ButtonInteractionLike extends MessageComponentInteractionLike {
  data?: InteractionData & { component_type: ComponentType.Button };
}

export interface SelectMenuInteractionLike extends MessageComponentInteractionLike {
  data?: InteractionData & {
    component_type: SelectComponentType;
  };
}

export interface StringSelectMenuInteractionLike extends MessageComponentInteractionLike {
  data?: InteractionData & { component_type: ComponentType.StringSelect };
}

export interface UserSelectMenuInteractionLike extends MessageComponentInteractionLike {
  data?: InteractionData & { component_type: ComponentType.UserSelect };
}

export interface RoleSelectMenuInteractionLike extends MessageComponentInteractionLike {
  data?: InteractionData & { component_type: ComponentType.RoleSelect };
}

export interface MentionableSelectMenuInteractionLike extends MessageComponentInteractionLike {
  data?: InteractionData & { component_type: ComponentType.MentionableSelect };
}

export interface ChannelSelectMenuInteractionLike extends MessageComponentInteractionLike {
  data?: InteractionData & { component_type: ComponentType.ChannelSelect };
}

export interface ModalSubmitInteractionLike extends InteractionLike {
  type: InteractionType.ModalSubmit;
}

function toDataPayload(payload: string | UnknownRecord): UnknownRecord {
  if (typeof payload === 'string') {
    return { content: payload };
  }
  return payload;
}

function isEphemeralFromFlags(flags: unknown): boolean {
  if (typeof flags === 'number') {
    return (flags & 64) === 64;
  }
  return false;
}

function isSelectComponentType(componentType: unknown): componentType is SelectComponentType {
  return (
    componentType === ComponentType.StringSelect ||
    componentType === ComponentType.UserSelect ||
    componentType === ComponentType.RoleSelect ||
    componentType === ComponentType.MentionableSelect ||
    componentType === ComponentType.ChannelSelect
  );
}

export function createInteractionFacade(raw: RawInteraction): InteractionLike {
  let response: InteractionCallbackResponse | null = null;

  const interaction: InteractionLike = {
    ...raw,
    guildId: raw.guild_id ?? null,
    channelId: raw.channel_id ?? null,
    applicationId: raw.application_id ?? null,
    replied: false,
    deferred: false,
    ephemeral: false,

    isRepliable: () =>
      raw.type === InteractionType.ApplicationCommand ||
      raw.type === InteractionType.MessageComponent ||
      raw.type === InteractionType.ModalSubmit,
    inGuild: () => Boolean(raw.guild_id),
    inCachedGuild: () => false,
    inRawGuild: () => Boolean(raw.guild_id),
    isCommand(): this is CommandInteractionLike {
      return raw.type === InteractionType.ApplicationCommand;
    },
    isAutocomplete(): this is AutocompleteInteractionLike {
      return raw.type === InteractionType.ApplicationCommandAutocomplete;
    },
    isChatInputCommand(): this is ChatInputCommandLike {
      return raw.type === InteractionType.ApplicationCommand && raw.data?.type === ApplicationCommandType.ChatInput;
    },
    isContextMenuCommand(): this is ContextMenuCommandLike {
      return (
      raw.type === InteractionType.ApplicationCommand &&
        (raw.data?.type === ApplicationCommandType.User || raw.data?.type === ApplicationCommandType.Message)
      );
    },
    isUserContextMenuCommand(): this is UserContextMenuCommandLike {
      return raw.type === InteractionType.ApplicationCommand && raw.data?.type === ApplicationCommandType.User;
    },
    isMessageContextMenuCommand(): this is MessageContextMenuCommandLike {
      return raw.type === InteractionType.ApplicationCommand && raw.data?.type === ApplicationCommandType.Message;
    },
    isMessageComponent(): this is MessageComponentInteractionLike {
      return raw.type === InteractionType.MessageComponent;
    },
    isButton(): this is ButtonInteractionLike {
      return raw.type === InteractionType.MessageComponent && raw.data?.component_type === ComponentType.Button;
    },
    isSelectMenu(): this is SelectMenuInteractionLike {
      return raw.type === InteractionType.MessageComponent && isSelectComponentType(raw.data?.component_type);
    },
    isAnySelectMenu(): this is SelectMenuInteractionLike {
      return raw.type === InteractionType.MessageComponent && isSelectComponentType(raw.data?.component_type);
    },
    isStringSelectMenu(): this is StringSelectMenuInteractionLike {
      return raw.type === InteractionType.MessageComponent && raw.data?.component_type === ComponentType.StringSelect;
    },
    isUserSelectMenu(): this is UserSelectMenuInteractionLike {
      return raw.type === InteractionType.MessageComponent && raw.data?.component_type === ComponentType.UserSelect;
    },
    isRoleSelectMenu(): this is RoleSelectMenuInteractionLike {
      return raw.type === InteractionType.MessageComponent && raw.data?.component_type === ComponentType.RoleSelect;
    },
    isMentionableSelectMenu(): this is MentionableSelectMenuInteractionLike {
      return raw.type === InteractionType.MessageComponent && raw.data?.component_type === ComponentType.MentionableSelect;
    },
    isChannelSelectMenu(): this is ChannelSelectMenuInteractionLike {
      return raw.type === InteractionType.MessageComponent && raw.data?.component_type === ComponentType.ChannelSelect;
    },
    isModalSubmit(): this is ModalSubmitInteractionLike {
      return raw.type === InteractionType.ModalSubmit;
    },

    reply: async (payload) => {
      const data = toDataPayload(payload as string | UnknownRecord);
      response = { type: 4, data };
      interaction.replied = true;
      interaction.deferred = false;
      interaction.ephemeral = isEphemeralFromFlags(data.flags);
      return response;
    },
    deferReply: async (options) => {
      const isEphemeral = Boolean(options?.ephemeral) || isEphemeralFromFlags(options?.flags);
      const data = isEphemeral ? { flags: 64 } : undefined;
      response = { type: 5, data };
      interaction.deferred = true;
      interaction.replied = false;
      interaction.ephemeral = isEphemeral;
      return response;
    },
    deferUpdate: async () => {
      response = { type: 6 };
      interaction.deferred = true;
      return response;
    },
    update: async (payload) => {
      response = { type: 7, data: toDataPayload(payload as string | UnknownRecord) };
      interaction.replied = true;
      return response;
    },
    respond: async (choices) => {
      response = { type: 8, data: { choices: choices as unknown as UnknownRecord[] } };
      interaction.replied = true;
      return response;
    },
    showModal: async (payload) => {
      response = { type: 9, data: payload };
      interaction.replied = true;
      return response;
    },
    editReply: async (payload) => {
      const previousType = response?.type ?? 4;
      response = { type: previousType, data: toDataPayload(payload as string | UnknownRecord) };
      interaction.replied = true;
      return response;
    },
    followUp: async (payload) => {
      response = { type: 4, data: toDataPayload(payload as string | UnknownRecord) };
      interaction.replied = true;
      return response;
    },
    fetchReply: async () => response?.data ?? {},
    deleteReply: async () => {
      response = null;
      interaction.replied = false;
      interaction.deferred = false;
      interaction.ephemeral = false;
    },
    getResponse: () => response
  };

  return interaction;
}