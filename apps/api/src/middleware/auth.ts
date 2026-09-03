import { config } from "@flowforge/config";
import type { NextFunction, Request, Response } from "express";

const SKIP_PREFIXES = ["/healthz", "/webhook"];

/**
 * Simple API-key gate. When `config.apiKey` is empty the middleware is a
 * no-op (local dev / behind a firewall). Otherwise every request must
 * present the key via `x-api-key` header or `?apiKey=` query param.
 *
 * Webhooks and health checks are excluded — webhooks authenticate via HMAC
 * and health checks must stay reachable from orchestrators.
 */
export function apiKeyAuth(req: Request, res: Response, next: NextFunction) {
	if (!config.apiKey) return next();

	for (const prefix of SKIP_PREFIXES) {
		if (req.path.startsWith(prefix)) return next();
	}

	const provided = req.header("x-api-key") ?? req.query.apiKey;
	if (provided !== config.apiKey) {
		res.status(401).json({ error: "invalid or missing API key" });
		return;
	}

	next();
}
