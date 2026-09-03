import { flows, getDb, webhookEndpoints } from "@flowforge/db";
import { verifyHmac } from "@flowforge/executor";
import { eq } from "drizzle-orm";
import { Router } from "express";
import { enqueueExecution } from "../queue.js";

const db = getDb();

/**
 * Dynamic webhook receiver. Mounted at /webhook (the app-level raw body
 * parser runs first so we get a Buffer for HMAC verification).
 *
 * External services POST payloads here; we look up the linked flow, verify
 * the HMAC signature if a secret is configured, then enqueue an execution.
 */
const router = Router();

router.post("/:path", async (req, res, next) => {
	try {
		const rows = await db
			.select()
			.from(webhookEndpoints)
			.where(eq(webhookEndpoints.path, req.params.path));
		const endpoint = rows[0];
		if (!endpoint) {
			res.status(404).json({ error: "unknown webhook path" });
			return;
		}

		// Check that the flow is active.
		const [flow] = await db
			.select({ active: flows.active })
			.from(flows)
			.where(eq(flows.id, endpoint.flowId));
		if (!flow?.active) {
			res.status(403).json({ error: "flow is not active" });
			return;
		}

		if (endpoint.secret) {
			const provided = req.header("x-flowforge-signature");
			const body = req.body as Buffer;
			const expected = verifyHmac(endpoint.secret, body);
			if (!provided || provided !== expected) {
				res.status(401).json({ error: "invalid signature" });
				return;
			}
		}

		let payload: Record<string, unknown> = {};
		const body = req.body as Buffer;
		if (body && body.length > 0) {
			try {
				payload = JSON.parse(body.toString("utf8"));
			} catch {
				payload = { raw: body.toString("utf8") };
			}
		}

		const job = await enqueueExecution(endpoint.flowId, payload);
		res.status(202).json({ jobId: job.id });
	} catch (e) {
		next(e);
	}
});

export default router;
