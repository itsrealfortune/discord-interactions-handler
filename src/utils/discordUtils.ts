/** Utility functions for Discord interactions */

import { verifyKey } from "discord-interactions";
import type { Context } from "hono";

function resolvePublicKey(c: Context): string | null {
  const fromContextEnv = (c as Context & { env?: Record<string, unknown> }).env
    ?.PUBLIC_KEY;
  if (typeof fromContextEnv === "string" && fromContextEnv.trim()) {
    return fromContextEnv.trim();
  }

  const processRef =
    typeof globalThis !== "undefined" &&
    "process" in globalThis &&
    typeof (globalThis as { process?: unknown }).process === "object"
      ? ((
          globalThis as {
            process?: { env?: Record<string, string | undefined> };
          }
        ).process ?? null)
      : null;

  const fromProcessEnv = processRef?.env?.PUBLIC_KEY;
  if (typeof fromProcessEnv === "string" && fromProcessEnv.trim()) {
    return fromProcessEnv.trim();
  }

  return null;
}

export async function verifySignature(
  c: Context,
  body: string,
): Promise<boolean> {
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
