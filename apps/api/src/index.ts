import { config } from "@flowforge/config";
import { getDb } from "@flowforge/db";
import { sql } from "drizzle-orm";
import { httpServer } from "./server.js";

// Touch the DB pool so connection errors surface at startup rather than
// on the first request.
const db = getDb();

void db.execute(sql`SELECT 1`).catch((e) => {
	console.error("[api] database connection failed", e);
	process.exit(1);
});

httpServer.listen(config.port, () => {
	console.log(`[api] listening on :${config.port}`);
	console.log(`[api] ws: ws://localhost:${config.port}/ws`);
});
