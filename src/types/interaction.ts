import {
    ApplicationCommandType,
    ComponentType,
    InteractionType,
    type ApplicationCommandOptionChoiceData,
    type InteractionDeferReplyOptions,
    type InteractionReplyOptions,
    type InteractionUpdateOptions
} from 'discord.js';

export type UnknownRecord = Record<string, unknown>;

export type InteractionData = {
  type?: number;
  component_type?: number;
  name?: string;
  custom_id?: string;
  values?: string[];
  options?: UnknownRecord[];
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

export type SelectComponentType =
  | ComponentType.StringSelect
  | ComponentType.UserSelect
  | ComponentType.RoleSelect
  | ComponentType.MentionableSelect
  | ComponentType.ChannelSelect;

export interface InteractionLike extends RawInteraction {
  guildId: string | null;
  channelId: string | null;
  applicationId: string | null;
  userId: string | null;
  commandName: string | null;
  customId: string | null;
  componentType: number | null;
  values: string[];
  createdTimestamp: number | null;
  createdAt: Date | null;
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

export type InteractionEventMap = {
  interaction: InteractionLike;
  autocomplete: AutocompleteInteractionLike;
  slashCommand: CommandInteractionLike;
  button: ButtonInteractionLike;
  messageComponent: MessageComponentInteractionLike;
  modalSubmit: ModalSubmitInteractionLike;
  selectMenu: SelectMenuInteractionLike;
};

export type InteractionEventName = keyof InteractionEventMap;
export type InteractionEventListener<E extends InteractionEventName> = (interaction: InteractionEventMap[E]) => void | Promise<void>;
