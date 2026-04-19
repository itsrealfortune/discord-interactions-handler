import { createClient, SupabaseClient } from "@supabase/supabase-js";
let supabaseAdminClient: SupabaseClient | null = null;

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

function nowMs(): number {
	if (
		typeof performance !== "undefined" &&
		typeof performance.now === "function"
	) {
		return performance.now();
	}

	return Date.now();
}

function shouldEnableDbHttpPerf(): boolean {
	return (
		isTruthyEnv(process.env.DB_HTTP_PERF) ||
		isTruthyEnv(process.env.RENDER_PERF) ||
		isTruthyEnv(process.env.DEV_MODE)
	);
}

function shouldUseSupabaseFetchWrapper(): boolean {
	return (
		shouldEnableDbHttpPerf() ||
		parseTimeoutMs(process.env.SUPABASE_HTTP_TIMEOUT_MS) > 0
	);
}

function buildSupabaseFetch(): typeof fetch {
	const enableHttpPerf = shouldEnableDbHttpPerf();
	const timeoutMs = parseTimeoutMs(process.env.SUPABASE_HTTP_TIMEOUT_MS);
	const logSlowThresholdMs =
		parseTimeoutMs(process.env.SUPABASE_HTTP_SLOW_MS) || 120;

	return async (input, init) => {
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
}

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
