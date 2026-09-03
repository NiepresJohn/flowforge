import { config } from "@flowforge/config";
import { getDb } from "@flowforge/db";
import { sql } from "drizzle-orm";
import { Router } from "express";
import { Redis } from "ioredis";

const router = Router();

router.get("/", (_req, res) => res.json({ status: "ok" }));

router.get("/deep", async (_req, res) => {
	const checks: Record<string, "ok" | "fail"> = {};

	// Database check
	try {
		const db = getDb();
		await db.execute(sql`SELECT 1`);
		checks["database"] = "ok";
	} catch {
		checks["database"] = "fail";
	}

	// Redis check
	try {
		const redis = new Redis(config.redisUrl, { maxRetriesPerRequest: 1 });
		await redis.ping();
		await redis.quit();
		checks["redis"] = "ok";
	} catch {
		checks["redis"] = "fail";
	}

	const allOk = Object.values(checks).every((v) => v === "ok");
	res.status(allOk ? 200 : 503).json({
		status: allOk ? "ok" : "degraded",
		checks,
	});
});

export default router;
