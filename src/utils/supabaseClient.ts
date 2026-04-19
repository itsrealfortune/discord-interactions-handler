import { createClient, type SupabaseClient } from "@supabase/supabase-js";
let supabaseAdminClient: SupabaseClient | null = null;

/**
 * Checks whether an environment variable represents a truthy boolean-like value.
 *
 * @param {string | undefined} value Raw value read from process.env.
 * @returns {boolean} True when the normalized value is 1, true, yes, or on.
 * @example
 * isTruthyEnv("true");
 * // true
 * @example
 * isTruthyEnv("0");
 * // false
 */
function isTruthyEnv(value: string | undefined): boolean {
	if (!value) {
		return false;
	}

	const normalized = value.trim().toLowerCase();
	return (
		normalized === "1" ||
		normalized === "true" ||
		normalized === "yes" ||
		normalized === "on"
	);
}

/**
 * Converts a timeout value to milliseconds with validation.
 *
 * @param {string | undefined} raw Raw timeout value (for example: "1500").
 * @returns {number} Positive integer in milliseconds, or 0 when invalid or missing.
 * @example
 * parseTimeoutMs("2500");
 * // 2500
 * @example
 * parseTimeoutMs("abc");
 * // 0
 */
function parseTimeoutMs(raw: string | undefined): number {
	if (!raw) {
		return 0;
	}

	const parsed = Number(raw);
	if (!Number.isFinite(parsed) || parsed <= 0) {
		return 0;
	}

	return Math.floor(parsed);
}

/**
 * Returns a monotonic timestamp when available, otherwise Date.now.
 *
 * @returns {number} Millisecond timestamp used for elapsed-time measurements.
 * @example
 * const start = nowMs();
 * // ... opération
 * const elapsed = nowMs() - start;
 */
function nowMs(): number {
	if (
		typeof performance !== "undefined" &&
		typeof performance.now === "function"
	) {
		return performance.now();
	}

	return Date.now();
}

/**
 * Indicates whether database HTTP performance logging should be enabled.
 *
 * @returns {boolean} True when DB_HTTP_PERF, RENDER_PERF, or DEV_MODE is truthy.
 * @example
 * // With DB_HTTP_PERF=true
 * shouldEnableDbHttpPerf();
 * // true
 */
function shouldEnableDbHttpPerf(): boolean {
	return (
		isTruthyEnv(process.env.DB_HTTP_PERF) ||
		isTruthyEnv(process.env.RENDER_PERF) ||
		isTruthyEnv(process.env.DEV_MODE)
	);
}

/**
 * Determines whether a custom fetch wrapper should be used for Supabase.
 *
 * @returns {boolean} True when HTTP perf logging is enabled or a timeout > 0 is configured.
 * @example
 * // With SUPABASE_HTTP_TIMEOUT_MS=3000
 * shouldUseSupabaseFetchWrapper();
 * // true
 */
function shouldUseSupabaseFetchWrapper(): boolean {
	return (
		shouldEnableDbHttpPerf() ||
		parseTimeoutMs(process.env.SUPABASE_HTTP_TIMEOUT_MS) > 0
	);
}

/**
 * Builds a Bun-compatible fetch that adds timeout handling and latency logging.
 *
 * The wrapper keeps the native fetch preconnect property to stay compatible
 * with Bun's global typeof fetch type.
 *
 * @returns {typeof fetch} Enhanced fetch function for the Supabase client.
 * @example
 * const customFetch = buildSupabaseFetch();
 * const res = await customFetch("https://example.com/rest/v1/health");
 */
function buildSupabaseFetch(): typeof fetch {
	const enableHttpPerf = shouldEnableDbHttpPerf();
	const timeoutMs = parseTimeoutMs(process.env.SUPABASE_HTTP_TIMEOUT_MS);
	const logSlowThresholdMs =
		parseTimeoutMs(process.env.SUPABASE_HTTP_SLOW_MS) || 120;
	const nativeFetch = fetch;

	const wrappedFetch: typeof fetch = async (input, init) => {
		const startedAt = enableHttpPerf ? nowMs() : 0;
		const baseInit = init || {};
		const nextInit = { ...baseInit } as RequestInit;

		let timeoutId: NodeJS.Timeout | null = null;
		let controller: AbortController | null = null;

		if (timeoutMs > 0) {
			controller = new AbortController();
			if (nextInit.signal) {
				if (nextInit.signal.aborted) {
					controller.abort();
				} else {
					nextInit.signal.addEventListener("abort", () => controller?.abort(), {
						once: true,
					});
				}
			}

			nextInit.signal = controller.signal;
			timeoutId = setTimeout(() => {
				controller?.abort();
			}, timeoutMs);
		}

		try {
			const response = await fetch(input, nextInit);

			if (enableHttpPerf) {
				const elapsedMs = nowMs() - startedAt;
				if (elapsedMs >= logSlowThresholdMs) {
					const method = nextInit.method || "GET";
					const rawUrl =
						typeof input === "string"
							? input
							: input instanceof URL
								? input.toString()
								: input.url;
					const shortUrl = rawUrl.replace(/^https?:\/\/[^/]+/i, "");
					console.log(
						`[perf][supabase-http] ${method} ${shortUrl} -> ${response.status} in ${elapsedMs.toFixed(1)}ms`,
					);
				}
			}

			return response;
		} finally {
			if (timeoutId) {
				clearTimeout(timeoutId);
			}
		}
	};

	wrappedFetch.preconnect = nativeFetch.preconnect.bind(nativeFetch);

	return wrappedFetch;
}

/**
 * Normalizes secrets loaded from environment variables.
 *
 * Cleans accidental wrapping quotes and strips a Bearer prefix when a full
 * Authorization header value was pasted.
 *
 * @param {string | undefined} raw Raw secret value.
 * @returns {string} Cleaned secret, or an empty string when missing.
 * @example
 * normalizeSecret('"Bearer abc.def.ghi"');
 * // "abc.def.ghi"
 */
function normalizeSecret(raw: string | undefined): string {
	if (!raw) {
		return "";
	}

	let value = raw.trim();

	// Common copy/paste issue from dashboards: wrapping quotes.
	if (
		(value.startsWith('"') && value.endsWith('"')) ||
		(value.startsWith("'") && value.endsWith("'"))
	) {
		value = value.slice(1, -1).trim();
	}

	// Users sometimes paste full Authorization header values.
	if (value.toLowerCase().startsWith("bearer ")) {
		value = value.slice(7).trim();
	}

	return value;
}

/**
 * Decodes a JWT payload without verifying the signature.
 *
 * @param {string} token JWT token encoded as header.payload.signature.
 * @returns {Record<string, unknown> | null} Decoded payload, or null when invalid.
 * @example
 * const payload = decodeJwtPayload(serviceRoleKey);
 * if (payload?.role === "service_role") {
 *   // expected role
 * }
 */
function decodeJwtPayload(token: string): Record<string, unknown> | null {
	const parts = token.split(".");
	if (parts.length < 2) {
		return null;
	}

	try {
		const payloadB64 = parts[1]?.replace(/-/g, "+").replace(/_/g, "/");
		const padded = payloadB64?.padEnd(
			Math.ceil(payloadB64.length / 4) * 4,
			"=",
		);
		if (!padded) {
			return null;
		}
		const json = Buffer.from(padded, "base64").toString("utf8");
		const parsed: unknown = JSON.parse(json);
		if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
			return null;
		}

		return parsed as Record<string, unknown>;
	} catch {
		return null;
	}
}

/**
 * Returns a singleton Supabase Admin client configured from environment values.
 *
 * The function validates and normalizes secrets, warns if the JWT does not
 * contain the service_role role, then memoizes the client for subsequent calls.
 *
 * @returns {SupabaseClient | null} Ready-to-use admin client, or null when configuration is incomplete.
 * @example
 * const supabase = getSupabaseAdminClient();
 * if (!supabase) {
 *   throw new Error("Supabase is not configured");
 * }
 * const { data, error } = await supabase.from("players").select("id").limit(1);
 */
export function getSupabaseAdminClient(): SupabaseClient | null {
	if (supabaseAdminClient) {
		return supabaseAdminClient;
	}

	const supabaseUrl = normalizeSecret(process.env.SUPABASE_URL);
	const serviceRoleKey = normalizeSecret(process.env.SUPABASE_SERVICE_ROLE_KEY);

	if (!supabaseUrl || !serviceRoleKey) {
		return null;
	}

	const payload = decodeJwtPayload(serviceRoleKey);
	if (payload && payload.role !== "service_role") {
		console.warn(
			`[db] SUPABASE_SERVICE_ROLE_KEY role is "${String(payload.role)}" instead of "service_role".`,
		);
	}

	supabaseAdminClient = createClient(supabaseUrl, serviceRoleKey, {
		auth: {
			autoRefreshToken: false,
			persistSession: false,
		},
		global: {
			...(shouldUseSupabaseFetchWrapper()
				? { fetch: buildSupabaseFetch() }
				: {}),
			headers: {
				"x-application-name": "konosuba-rpg",
			},
		},
	});

	return supabaseAdminClient;
}
