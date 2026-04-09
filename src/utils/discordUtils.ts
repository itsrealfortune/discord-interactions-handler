/** Utility functions for Discord interactions */

import { verifyKey } from 'discord-interactions';
import type { Context } from 'hono';

export async function verifySignature(c: Context, body: string): Promise<boolean> {
  const signature = c.req.header('x-signature-ed25519');
  const timestamp = c.req.header('x-signature-timestamp');
  const PUBLIC_KEY = process.env?.PUBLIC_KEY?.trim();

  if (!signature || !timestamp || !PUBLIC_KEY) {
    console.warn('Missing required headers or public key');
    return false;
  }

  const isValid = await verifyKey(body, signature, timestamp, PUBLIC_KEY);
  if (!isValid) console.warn('Invalid request signature');

  return isValid;
}
