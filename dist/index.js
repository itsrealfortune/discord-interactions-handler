// src/index.ts
import { Hono } from "hono";

// src/handler.ts
import { EventEmitter } from "events";
var InteractionHandler = class extends EventEmitter {
  constructor() {
    super();
  }
  on(event, listener) {
    return super.on(event, listener);
  }
  once(event, listener) {
    return super.once(event, listener);
  }
  off(event, listener) {
    return super.off(event, listener);
  }
  async emitAsync(event, interaction) {
    const listeners = this.listeners(event);
    await Promise.allSettled(
      listeners.map((listener) => Promise.resolve(listener(interaction)))
    );
  }
  /** Emit for every non-ping interaction. */
  async emitInteraction(interaction) {
    await this.emitAsync("interaction", interaction);
  }
  /** Emit for autocomplete interactions only. */
  async emitAutocomplete(interaction) {
    await this.emitAsync("autocomplete", interaction);
  }
  /** Emit for button component interactions only. */
  async emitButton(interaction) {
    await this.emitAsync("button", interaction);
  }
  /** Emit for any message component interaction. */
  async emitMessageComponent(interaction) {
    await this.emitAsync("messageComponent", interaction);
  }
  /** Emit for slash and context command interactions. */
  async emitSlashCommand(interaction) {
    await this.emitAsync("slashCommand", interaction);
  }
  /** Emit for modal submit interactions only. */
  async emitModalSubmit(interaction) {
    await this.emitAsync("modalSubmit", interaction);
  }
  /** Emit for any select menu interaction. */
  async emitSelectMenu(interaction) {
    await this.emitAsync("selectMenu", interaction);
  }
  /**
   * Legacy HTTP response helper.
   *
   * Prefer using the interaction facade methods (reply/deferReply/etc.)
   * inside listeners when possible.
   */
  reply(c, response) {
    const interactionId = c.req.header("x-interaction-id");
    const interactionToken = c.req.header("x-interaction-token");
    if (!interactionId || !interactionToken) {
      console.warn("Missing interaction ID or token in headers");
      return c.text("Missing interaction ID or token", 400);
    }
    const type = interactionId ? 4 : 5;
    return c.json({ type, data: response });
  }
  /** Legacy deferred response helper (type 5). */
  deferReply(c) {
    const interactionId = c.req.header("x-interaction-id");
    const interactionToken = c.req.header("x-interaction-token");
    if (!interactionId || !interactionToken) {
      console.warn("Missing interaction ID or token in headers");
      return c.text("Missing interaction ID or token", 400);
    }
    return c.json({ type: 5 });
  }
};

// src/routes/interactions.ts
import { InteractionType as InteractionType2 } from "discord.js";
import "hono";

// src/utils/discordUtils.ts
import { verifyKey } from "discord-interactions";
function resolvePublicKey(c) {
  const fromContextEnv = c.env?.PUBLIC_KEY;
  if (typeof fromContextEnv === "string" && fromContextEnv.trim()) {
    return fromContextEnv.trim();
  }
  const processRef = typeof globalThis !== "undefined" && "process" in globalThis && typeof globalThis.process === "object" ? globalThis.process ?? null : null;
  const fromProcessEnv = processRef?.env?.PUBLIC_KEY;
  if (typeof fromProcessEnv === "string" && fromProcessEnv.trim()) {
    return fromProcessEnv.trim();
  }
  return null;
}
async function verifySignature(c, body) {
  const signature = c.req.header("x-signature-ed25519");
  const timestamp = c.req.header("x-signature-timestamp");
  const PUBLIC_KEY = resolvePublicKey(c);
  if (!signature || !timestamp || !PUBLIC_KEY) {
    console.warn("Missing required headers or public key");
    return false;
  }
  const isValid = await verifyKey(body, signature, timestamp, PUBLIC_KEY);
  if (!isValid) console.warn("Invalid request signature");
  return isValid;
}

// src/utils/interactionFacade.ts
import {
  ApplicationCommandType,
  ComponentType,
  InteractionType
} from "discord.js";
function toDataPayload(payload) {
  if (typeof payload === "string") {
    return { content: payload };
  }
  return payload;
}
function isEphemeralFromFlags(flags) {
  if (typeof flags === "number") {
    return (flags & 64) === 64;
  }
  return false;
}
function isSelectComponentType(componentType) {
  return componentType === ComponentType.StringSelect || componentType === ComponentType.UserSelect || componentType === ComponentType.RoleSelect || componentType === ComponentType.MentionableSelect || componentType === ComponentType.ChannelSelect;
}
function parseSnowflakeTimestamp(interactionId) {
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
function getUserId(raw) {
  const memberUser = raw.member?.user;
  if (memberUser && typeof memberUser === "object" && "id" in memberUser && typeof memberUser.id === "string") {
    return memberUser.id;
  }
  if (raw.user && typeof raw.user === "object" && "id" in raw.user && typeof raw.user.id === "string") {
    return raw.user.id;
  }
  return null;
}
function createInteractionFacade(raw) {
  let response = null;
  const interaction = {
    ...raw,
    guildId: raw.guild_id ?? null,
    channelId: raw.channel_id ?? null,
    applicationId: raw.application_id ?? null,
    userId: getUserId(raw),
    commandName: typeof raw.data?.name === "string" ? raw.data.name : null,
    customId: typeof raw.data?.custom_id === "string" ? raw.data.custom_id : null,
    componentType: typeof raw.data?.component_type === "number" ? raw.data.component_type : null,
    values: Array.isArray(raw.data?.values) ? raw.data.values.filter(
      (value) => typeof value === "string"
    ) : [],
    createdTimestamp: parseSnowflakeTimestamp(raw.id),
    createdAt: (() => {
      const timestamp = parseSnowflakeTimestamp(raw.id);
      return timestamp === null ? null : new Date(timestamp);
    })(),
    replied: false,
    deferred: false,
    ephemeral: false,
    isRepliable: () => raw.type === InteractionType.ApplicationCommand || raw.type === InteractionType.MessageComponent || raw.type === InteractionType.ModalSubmit,
    inGuild: () => Boolean(raw.guild_id),
    inCachedGuild: () => false,
    inRawGuild: () => Boolean(raw.guild_id),
    isCommand() {
      return raw.type === InteractionType.ApplicationCommand;
    },
    isAutocomplete() {
      return raw.type === InteractionType.ApplicationCommandAutocomplete;
    },
    isChatInputCommand() {
      return raw.type === InteractionType.ApplicationCommand && raw.data?.type === ApplicationCommandType.ChatInput;
    },
    isContextMenuCommand() {
      return raw.type === InteractionType.ApplicationCommand && (raw.data?.type === ApplicationCommandType.User || raw.data?.type === ApplicationCommandType.Message);
    },
    isUserContextMenuCommand() {
      return raw.type === InteractionType.ApplicationCommand && raw.data?.type === ApplicationCommandType.User;
    },
    isMessageContextMenuCommand() {
      return raw.type === InteractionType.ApplicationCommand && raw.data?.type === ApplicationCommandType.Message;
    },
    isMessageComponent() {
      return raw.type === InteractionType.MessageComponent;
    },
    isButton() {
      return raw.type === InteractionType.MessageComponent && raw.data?.component_type === ComponentType.Button;
    },
    isSelectMenu() {
      return raw.type === InteractionType.MessageComponent && isSelectComponentType(raw.data?.component_type);
    },
    isAnySelectMenu() {
      return raw.type === InteractionType.MessageComponent && isSelectComponentType(raw.data?.component_type);
    },
    isStringSelectMenu() {
      return raw.type === InteractionType.MessageComponent && raw.data?.component_type === ComponentType.StringSelect;
    },
    isUserSelectMenu() {
      return raw.type === InteractionType.MessageComponent && raw.data?.component_type === ComponentType.UserSelect;
    },
    isRoleSelectMenu() {
      return raw.type === InteractionType.MessageComponent && raw.data?.component_type === ComponentType.RoleSelect;
    },
    isMentionableSelectMenu() {
      return raw.type === InteractionType.MessageComponent && raw.data?.component_type === ComponentType.MentionableSelect;
    },
    isChannelSelectMenu() {
      return raw.type === InteractionType.MessageComponent && raw.data?.component_type === ComponentType.ChannelSelect;
    },
    isModalSubmit() {
      return raw.type === InteractionType.ModalSubmit;
    },
    reply: async (payload) => {
      const data = toDataPayload(payload);
      response = { type: 4, data };
      interaction.replied = true;
      interaction.deferred = false;
      interaction.ephemeral = isEphemeralFromFlags(data.flags);
      return response;
    },
    deferReply: async (options) => {
      const isEphemeral = Boolean(options?.ephemeral) || isEphemeralFromFlags(options?.flags);
      const data = isEphemeral ? { flags: 64 } : void 0;
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
      response = {
        type: 7,
        data: toDataPayload(payload)
      };
      interaction.replied = true;
      return response;
    },
    respond: async (choices) => {
      response = {
        type: 8,
        data: { choices }
      };
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
      response = {
        type: previousType,
        data: toDataPayload(payload)
      };
      interaction.replied = true;
      return response;
    },
    followUp: async (payload) => {
      response = {
        type: 4,
        data: toDataPayload(payload)
      };
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

// src/routes/interactions.ts
async function handleInteractions(c, emitter) {
  const body = await c.req.text();
  const isVerified = await verifySignature(c, body);
  if (!isVerified) {
    return c.text("Invalid signature", 401);
  }
  let rawInteraction;
  try {
    rawInteraction = JSON.parse(body);
  } catch {
    return c.text("Invalid JSON payload", 400);
  }
  if (!rawInteraction || typeof rawInteraction !== "object" || Array.isArray(rawInteraction) || typeof rawInteraction.type !== "number") {
    return c.text("Invalid interaction payload", 400);
  }
  const type = rawInteraction.type;
  const interaction = createInteractionFacade(rawInteraction);
  if (type === InteractionType2.Ping) {
    return c.json({ type: 1 });
  }
  if (type === InteractionType2.ApplicationCommandAutocomplete) {
    await emitter.emitInteraction(interaction);
    if (interaction.isAutocomplete()) {
      await emitter.emitAutocomplete(interaction);
    }
    return c.json(
      interaction.getResponse() ?? { type: 8, data: { choices: [] } }
    );
  }
  if (type === InteractionType2.ApplicationCommand) {
    await emitter.emitInteraction(interaction);
    if (interaction.isCommand()) {
      await emitter.emitSlashCommand(interaction);
    }
    return c.json(interaction.getResponse() ?? { type: 5 });
  }
  if (type === InteractionType2.MessageComponent) {
    await emitter.emitInteraction(interaction);
    if (interaction.isMessageComponent()) {
      await emitter.emitMessageComponent(interaction);
    }
    if (interaction.isButton()) {
      await emitter.emitButton(interaction);
    }
    if (interaction.isAnySelectMenu()) {
      await emitter.emitSelectMenu(interaction);
    }
    return c.json(interaction.getResponse() ?? { type: 6 });
  }
  if (type === InteractionType2.ModalSubmit) {
    await emitter.emitInteraction(interaction);
    if (interaction.isModalSubmit()) {
      await emitter.emitModalSubmit(interaction);
    }
    return c.json(interaction.getResponse() ?? { type: 5 });
  }
  return c.json({ error: "Unknown interaction" }, 400);
}

// src/index.ts
var app = new Hono();
var client = new InteractionHandler();
app.post("/api/interactions", (c) => handleInteractions(c, client));
var index_default = { app, client };
export {
  index_default as default
};
