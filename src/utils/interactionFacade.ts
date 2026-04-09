import { ComponentType, InteractionType } from 'discord.js';

type UnknownRecord = Record<string, unknown>;

type InteractionData = {
  type?: number;
  component_type?: number;
  [key: string]: unknown;
};

type RawInteraction = {
  id?: string;
  token?: string;
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

export type InteractionLike = RawInteraction & {
  replied: boolean;
  deferred: boolean;
  ephemeral: boolean;
  isRepliable: () => boolean;
  inGuild: () => boolean;
  inCachedGuild: () => boolean;
  inRawGuild: () => boolean;
  isAutocomplete: () => boolean;
  isChatInputCommand: () => boolean;
  isContextMenuCommand: () => boolean;
  isUserContextMenuCommand: () => boolean;
  isMessageContextMenuCommand: () => boolean;
  isButton: () => boolean;
  isAnySelectMenu: () => boolean;
  isStringSelectMenu: () => boolean;
  isUserSelectMenu: () => boolean;
  isRoleSelectMenu: () => boolean;
  isMentionableSelectMenu: () => boolean;
  isChannelSelectMenu: () => boolean;
  isModalSubmit: () => boolean;
  reply: (payload: string | UnknownRecord) => Promise<void>;
  deferReply: (options?: { ephemeral?: boolean }) => Promise<void>;
  deferUpdate: () => Promise<void>;
  update: (payload: UnknownRecord) => Promise<void>;
  respond: (choices: UnknownRecord[]) => Promise<void>;
  showModal: (payload: UnknownRecord) => Promise<void>;
  editReply: (payload: UnknownRecord) => Promise<void>;
  followUp: (payload: UnknownRecord) => Promise<void>;
  fetchReply: () => Promise<UnknownRecord>;
  deleteReply: () => Promise<void>;
  getResponse: () => InteractionCallbackResponse | null;
};

function toDataPayload(payload: string | UnknownRecord): UnknownRecord {
  if (typeof payload === 'string') {
    return { content: payload };
  }
  return payload;
}

export function createInteractionFacade(raw: RawInteraction): InteractionLike {
  let response: InteractionCallbackResponse | null = null;

  const interaction: InteractionLike = {
    ...raw,
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
    isAutocomplete: () => raw.type === InteractionType.ApplicationCommandAutocomplete,
    isChatInputCommand: () => raw.type === InteractionType.ApplicationCommand && raw.data?.type === 1,
    isContextMenuCommand: () => raw.type === InteractionType.ApplicationCommand && (raw.data?.type === 2 || raw.data?.type === 3),
    isUserContextMenuCommand: () => raw.type === InteractionType.ApplicationCommand && raw.data?.type === 2,
    isMessageContextMenuCommand: () => raw.type === InteractionType.ApplicationCommand && raw.data?.type === 3,
    isButton: () => raw.type === InteractionType.MessageComponent && raw.data?.component_type === ComponentType.Button,
    isAnySelectMenu: () =>
      raw.type === InteractionType.MessageComponent &&
      (raw.data?.component_type === ComponentType.StringSelect ||
        raw.data?.component_type === ComponentType.UserSelect ||
        raw.data?.component_type === ComponentType.RoleSelect ||
        raw.data?.component_type === ComponentType.MentionableSelect ||
        raw.data?.component_type === ComponentType.ChannelSelect),
    isStringSelectMenu: () => raw.type === InteractionType.MessageComponent && raw.data?.component_type === ComponentType.StringSelect,
    isUserSelectMenu: () => raw.type === InteractionType.MessageComponent && raw.data?.component_type === ComponentType.UserSelect,
    isRoleSelectMenu: () => raw.type === InteractionType.MessageComponent && raw.data?.component_type === ComponentType.RoleSelect,
    isMentionableSelectMenu: () => raw.type === InteractionType.MessageComponent && raw.data?.component_type === ComponentType.MentionableSelect,
    isChannelSelectMenu: () => raw.type === InteractionType.MessageComponent && raw.data?.component_type === ComponentType.ChannelSelect,
    isModalSubmit: () => raw.type === InteractionType.ModalSubmit,

    reply: async (payload) => {
      const data = toDataPayload(payload);
      response = { type: 4, data };
      interaction.replied = true;
      interaction.deferred = false;
      interaction.ephemeral = (Number(data.flags) & 64) === 64;
    },
    deferReply: async (options) => {
      const data = options?.ephemeral ? { flags: 64 } : undefined;
      response = { type: 5, data };
      interaction.deferred = true;
      interaction.replied = false;
      interaction.ephemeral = Boolean(options?.ephemeral);
    },
    deferUpdate: async () => {
      response = { type: 6 };
      interaction.deferred = true;
    },
    update: async (payload) => {
      response = { type: 7, data: payload };
      interaction.replied = true;
    },
    respond: async (choices) => {
      response = { type: 8, data: { choices } };
      interaction.replied = true;
    },
    showModal: async (payload) => {
      response = { type: 9, data: payload };
      interaction.replied = true;
    },
    editReply: async (payload) => {
      const previousType = response?.type ?? 4;
      response = { type: previousType, data: payload };
      interaction.replied = true;
    },
    followUp: async (payload) => {
      response = { type: 4, data: payload };
      interaction.replied = true;
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