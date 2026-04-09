import {
    ApplicationCommandType,
    ComponentType,
    InteractionType
} from 'discord.js';
import type {
    AutocompleteInteractionLike,
    ButtonInteractionLike,
    ChannelSelectMenuInteractionLike,
    ChatInputCommandLike,
    CommandInteractionLike,
    ContextMenuCommandLike,
    InteractionCallbackResponse,
    InteractionLike,
    MentionableSelectMenuInteractionLike,
    MessageComponentInteractionLike,
    MessageContextMenuCommandLike,
    ModalSubmitInteractionLike,
    RawInteraction,
    RoleSelectMenuInteractionLike,
    SelectComponentType,
    SelectMenuInteractionLike,
    StringSelectMenuInteractionLike,
    UnknownRecord,
    UserContextMenuCommandLike,
    UserSelectMenuInteractionLike
} from '../types/interaction';

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

function parseSnowflakeTimestamp(interactionId: string | undefined): number | null {
  if (!interactionId) {
    return null;
  }

  try {
    const discordEpoch = 1420070400000n;
    const timestamp = (BigInt(interactionId) >> 22n) + discordEpoch;
    return Number(timestamp);
  } catch {
    return null;
  }
}

function getUserId(raw: RawInteraction): string | null {
  const memberUser = raw.member?.user;
  if (memberUser && typeof memberUser === 'object' && 'id' in memberUser && typeof memberUser.id === 'string') {
    return memberUser.id;
  }

  if (raw.user && typeof raw.user === 'object' && 'id' in raw.user && typeof raw.user.id === 'string') {
    return raw.user.id;
  }

  return null;
}

export function createInteractionFacade(raw: RawInteraction): InteractionLike {
  let response: InteractionCallbackResponse | null = null;

  const interaction: InteractionLike = {
    ...raw,
    guildId: raw.guild_id ?? null,
    channelId: raw.channel_id ?? null,
    applicationId: raw.application_id ?? null,
    userId: getUserId(raw),
    commandName: typeof raw.data?.name === 'string' ? raw.data.name : null,
    customId: typeof raw.data?.custom_id === 'string' ? raw.data.custom_id : null,
    componentType: typeof raw.data?.component_type === 'number' ? raw.data.component_type : null,
    values: Array.isArray(raw.data?.values) ? raw.data.values.filter((value): value is string => typeof value === 'string') : [],
    createdTimestamp: parseSnowflakeTimestamp(raw.id),
    createdAt: (() => {
      const timestamp = parseSnowflakeTimestamp(raw.id);
      return timestamp === null ? null : new Date(timestamp);
    })(),
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