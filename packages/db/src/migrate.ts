import { fileURLToPath } from "node:url";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { getDb } from "./db.js";

// Resolve relative to this file (works from src/ and dist/), not the process cwd.
const migrationsFolder = fileURLToPath(
	new URL("../migrations", import.meta.url),
);

export async function migrateDb(): Promise<void> {
	const db = getDb();
	await migrate(db, { migrationsFolder });
}
