/** Utility functions for Discord interactions */

import { verifyKey } from "discord-interactions";
import type { Context } from "hono";

/**
 * Resolves the Discord public key from Hono context first, then process.env.
 *
 * Priority order:
 * 1) c.env.PUBLIC_KEY (useful in edge/serverless runtimes)
 * 2) process.env.PUBLIC_KEY
 *
 * @param {Context} c Hono HTTP context for the incoming request.
 * @returns {string | null} Trimmed public key, or null when not found.
 * @example
 * const publicKey = resolvePublicKey(c);
 * if (!publicKey) {
 *   return c.text("Missing configuration", 500);
 * }
 */
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

/**
 * Verifies the ED25519 signature of a Discord request.
 *
 * This validation is required to reject unsigned or forged requests
 * before any business logic runs.
 *
 * @param {Context} c Hono HTTP context containing Discord headers.
 * @param {string} body Raw request body exactly as received.
 * @returns {Promise<boolean>} True when the signature is valid, otherwise false.
 * @example
 * const body = await c.req.text();
 * const ok = await verifySignature(c, body);
 * if (!ok) {
 *   return c.text("Invalid signature", 401);
 * }
 */
export async function verifySignature(
	c: Context,
	body: string,
): Promise<boolean> {
	const signature = c.req.header("x-signature-ed25519");
	const timestamp = c.req.header("x-signature-timestamp");
	const PublicKey = resolvePublicKey(c);

	if (!signature || !timestamp || !PublicKey) {
		console.warn("Missing required headers or public key");
		return false;
	}

	const isValid = await verifyKey(body, signature, timestamp, PublicKey);
	if (!isValid) console.warn("Invalid request signature");

	return isValid;
}
