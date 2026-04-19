import { Hono } from "hono";
import { InteractionHandler } from "./handler";
import { handleInteractions } from "./routes/interactions";

/**
 * Main Hono application exposing the Discord interactions endpoint.
 *
 * @type {Hono}
 * @example
 * app.post("/api/interactions", (c) => handleInteractions(c, client));
 */
const app = new Hono();

/**
 * Central interaction event bus for Discord interactions.
 *
 * @type {InteractionHandler}
 * @example
 * client.on("slashCommand", async (interaction) => {
 *   await interaction.reply({ content: "Hello" });
 * });
 */
const client = new InteractionHandler();

/**
 * Single route used to receive Discord callbacks.
 *
 * @example
 * curl -X POST http://localhost:3000/api/interactions
 */
app.post("/api/interactions", (c) => handleInteractions(c, client));

/**
 * Main library export.
 *
 * @type {{ app: Hono; client: InteractionHandler }}
 * @example
 * import server from "discord-interactions-handler";
 * server.client.on("interaction", async () => {});
 */
export default { app, client };
