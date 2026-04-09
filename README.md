# discord-interactions-handler

> [!WARNING]
> This package is currently under active development.
> Breaking changes can happen at any time, including API changes and behavior changes.
> Do not rely on this package in production without pinning an exact version and testing each update.

TypeScript handler for Discord Interactions Endpoint URL bots, built with Hono.

It provides:

- a `POST /api/interactions` route with Ed25519 signature verification
- a strongly typed interaction event bus
- a Discord.js-like interaction facade (`reply`, `deferReply`, `isButton`, etc.)

## Features

- Signature verification using Discord headers:
  - `x-signature-ed25519`
  - `x-signature-timestamp`
- Supported interaction types:
  - `Ping`
  - `ApplicationCommand`
  - `ApplicationCommandAutocomplete`
  - `MessageComponent` (buttons and select menus)
  - `ModalSubmit`
- Typed events for listener autocomplete:
  - `interaction`
  - `autocomplete`
  - `slashCommand`
  - `messageComponent`
  - `button`
  - `selectMenu`
  - `modalSubmit`
- Automatic Discord callback response handling in the HTTP route

## Runtime Compatibility

This package is designed for fetch-compatible runtimes.

- Bun: supported
- Node.js: supported (with a fetch/server adapter)
- Vercel (Node runtime): supported
- Vercel (Edge runtime): supported
- Cloudflare Workers: supported (enable Node.js compatibility because `events` is used)

Cloudflare `wrangler.toml` example:

```toml
name = "discord-interactions-handler"
main = "src/worker.ts"
compatibility_date = "2025-01-01"
compatibility_flags = ["nodejs_compat"]
```

## Installation

```bash
npm i discord-interactions-handler
```

## Configuration

Required environment variable:

- `PUBLIC_KEY`: your Discord application public key

You can provide it from:

- `process.env.PUBLIC_KEY` (Node, Bun, Vercel)
- `c.env.PUBLIC_KEY` (platform bindings like Workers)

## Public API

Default import:

```ts
import interactionsApi from "discord-interactions-handler";

const { app, client } = interactionsApi;
```

- `app`: Hono app with `POST /api/interactions`
- `client`: `InteractionHandler` instance for typed listeners

## Quick Start

```ts
import interactionsApi from "discord-interactions-handler";

interactionsApi.client.on("slashCommand", async (interaction) => {
  if (!interaction.isChatInputCommand()) {
    await interaction.deferReply({ ephemeral: true });
    return;
  }

  if (interaction.commandName === "ping") {
    await interaction.reply({ content: "Pong" });
    return;
  }

  await interaction.reply({ content: "Unknown command" });
});
```

Set your Discord Interactions Endpoint URL to:

```text
https://your-domain.tld/api/interactions
```

## Deployment Examples

### Bun

```ts
import interactionsApi from "discord-interactions-handler";

Bun.serve({
  port: Number(process.env.PORT ?? 3000),
  fetch: interactionsApi.app.fetch,
});
```

### Node.js

```ts
import interactionsApi from "discord-interactions-handler";

export default interactionsApi.app;
```

### Vercel Edge Function

```ts
import interactionsApi from "discord-interactions-handler";

export const runtime = "edge";
export default interactionsApi.app.fetch;
```

### Vercel Node Function

```ts
import interactionsApi from "discord-interactions-handler";

export const runtime = "nodejs";
export default interactionsApi.app.fetch;
```

### Cloudflare Worker

```ts
import interactionsApi from "discord-interactions-handler";

export default {
  fetch: interactionsApi.app.fetch,
};
```

## Typed Event API

`InteractionHandler` exposes typed `on`, `once`, and `off` methods.

```ts
import interactionsApi from "discord-interactions-handler";

interactionsApi.client.on("button", async (interaction) => {
  if (interaction.customId === "approve") {
    await interaction.update({ content: "Approved." });
  }
});

interactionsApi.client.on("selectMenu", async (interaction) => {
  await interaction.reply({
    content: `Selected: ${interaction.values.join(", ")}`,
    flags: 64,
  });
});

interactionsApi.client.on("autocomplete", async (interaction) => {
  await interaction.respond([
    { name: "JavaScript", value: "js" },
    { name: "TypeScript", value: "ts" },
  ]);
});

interactionsApi.client.on("modalSubmit", async (interaction) => {
  await interaction.reply({ content: "Modal submitted." });
});
```

## Interaction Facade

Discord.js-like helpers include:

- Type guards: `isCommand`, `isAutocomplete`, `isButton`, `isAnySelectMenu`, `isModalSubmit`, and more
- Response builders:
  - `reply` -> callback type `4`
  - `deferReply` -> callback type `5`
  - `deferUpdate` -> callback type `6`
  - `update` -> callback type `7`
  - `respond` -> callback type `8`
  - `showModal` -> callback type `9`

Normalized fields:

- `guildId`, `channelId`, `applicationId`, `userId`
- `commandName`, `customId`, `componentType`, `values`
- `createdTimestamp`, `createdAt`

## Project Structure

```text
src/
  index.ts
  handler.ts
  routes/
    interactions.ts
  types/
    interaction.ts
  utils/
    discordUtils.ts
    interactionFacade.ts
```

## Scripts

```bash
# typecheck
npm run check

# lint
npm run lint

# format
npm run format

# tests
npm run test
```

## Notes

- This package targets Discord Interactions Endpoint URL flow (HTTP webhooks), not gateway bot event streams.
- Safe default callback behavior is used when no listener responds:
  - autocomplete -> empty choices
  - slash/modal -> deferred reply
  - message component -> deferred update
