import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import { schema } from "./schema.js";

const { Pool } = pg;

let pool: pg.Pool | null = null;

/** Single shared pool so the API and worker don't open redundant connections. */
export function getPool(): pg.Pool {
	if (!pool) {
		const connectionString =
			process.env["DATABASE_URL"] ??
			"postgres://postgres:postgres@localhost:5432/flowforge";
		pool = new Pool({ connectionString });
	}
	return pool;
}

export function getDb() {
	return drizzle(getPool(), { schema });
}

export type Db = ReturnType<typeof getDb>;
