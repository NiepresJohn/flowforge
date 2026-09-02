/**
 * Shared environment configuration consumed by the API, worker, and CLI.
 * Centralising it here keeps worker↔api coupling at zero while every
 * process agrees on queue names, Redis URLs, etc.
 */
import "dotenv/config";

function asNumber(value: string | undefined, fallback: number): number {
	if (!value) return fallback;
	const n = Number(value);
	return Number.isNaN(n) ? fallback : n;
}

function env(key: string, fallback: string): string {
	const v = process.env[key];
	return v ?? fallback;
}

export const config = {
	port: asNumber(process.env["PORT"], 4000),
	databaseUrl: env(
		"DATABASE_URL",
		"postgres://postgres:postgres@localhost:5432/flowforge",
	),
	redisUrl: env("REDIS_URL", "redis://localhost:6379"),
	baseUrl: env("BASE_URL", "http://localhost:4000"),
	queueName: env("QUEUE_NAME", "flow-executions"),
	executionConcurrency: asNumber(process.env["EXECUTOR_CONCURRENCY"], 5),
} as const;
