import { config } from "@flowforge/config";
import { getDb, migrateDb } from "@flowforge/db";
import { sql } from "drizzle-orm";
import { startScheduler, stopScheduler } from "./scheduler.js";
import { httpServer, shutdown } from "./server.js";

async function main() {
	// Verify DB connectivity at startup.
	const db = getDb();
	await db.execute(sql`SELECT 1`).catch((e) => {
		console.error("[api] database connection failed", e);
		process.exit(1);
	});

	// Run migrations.
	console.log("[api] running migrations...");
	await migrateDb();
	console.log("[api] migrations complete");

	httpServer.listen(config.port, () => {
		console.log(`[api] listening on :${config.port}`);
		console.log(`[api] ws: ws://localhost:${config.port}/ws`);
	});

	// Start cron scheduler.
	startScheduler();
}

main().catch((e) => {
	console.error("[api] fatal startup error", e);
	process.exit(1);
});

// Graceful shutdown.
for (const signal of ["SIGTERM", "SIGINT"] as const) {
	process.on(signal, () => {
		console.log(`[api] received ${signal}, shutting down...`);
		stopScheduler();
		shutdown();
	});
}
