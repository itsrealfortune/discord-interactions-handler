import { Hono } from "hono";
import { InteractionHandler } from "./handler";
import { handleInteractions } from "./routes/interactions";

const app = new Hono();
const client = new InteractionHandler();
app.post("/api/interactions", (c) => handleInteractions(c, client));
export default { app, client };
