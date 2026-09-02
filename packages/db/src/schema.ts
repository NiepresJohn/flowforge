import {
	boolean,
	jsonb,
	pgTable,
	text,
	timestamp,
	uuid,
} from "drizzle-orm/pg-core";

/**
 * Domain model → table mapping.
 * Flows reference trigger/action nodes; the integrations package discovers
 * the registry at runtime and the API caches manifests in `integrations`.
 */

export const flows = pgTable("flows", {
	id: uuid("id").primaryKey().defaultRandom(),
	name: text("name").notNull(),
	description: text("description").notNull().default(""),
	active: boolean("active").notNull().default(false),
	/**
	 * The entry-point node. Nullable during creation (the trigger node is
	 * created in the same transaction right after the flow row), set to that
	 * node's id. Enforced as set at execution time.
	 */
	triggerNodeId: uuid("trigger_node_id"),
	createdAt: timestamp("created_at", { mode: "string" }).notNull().defaultNow(),
	updatedAt: timestamp("updated_at", { mode: "string" })
		.notNull()
		.defaultNow()
		.$onUpdate(() => new Date().toISOString()),
});

export const flowNodes = pgTable("flow_nodes", {
	id: uuid("id").primaryKey().defaultRandom(),
	flowId: uuid("flow_id")
		.notNull()
		.references(() => flows.id, { onDelete: "cascade" }),
	type: text("type", { enum: ["trigger", "action"] }).notNull(),
	integrationId: text("integration_id").notNull(),
	operationKey: text("operation_key").notNull(),
	config: jsonb("config").notNull().default({}),
	positionX: text("position_x").notNull().default("0"),
	positionY: text("position_y").notNull().default("0"),
});

export const flowEdges = pgTable("flow_edges", {
	id: uuid("id").primaryKey().defaultRandom(),
	flowId: uuid("flow_id")
		.notNull()
		.references(() => flows.id, { onDelete: "cascade" }),
	sourceNodeId: uuid("source_node_id").notNull(),
	targetNodeId: uuid("target_node_id").notNull(),
});

export const integrations = pgTable("integrations", {
	id: text("id").primaryKey(),
	name: text("name").notNull(),
	description: text("description").notNull().default(""),
	icon: text("icon").notNull().default("🔌"),
	version: text("version").notNull().default("0.0.0"),
	author: text("author").notNull().default(""),
});

export const nodeOperations = pgTable("node_operations", {
	id: uuid("id").primaryKey().defaultRandom(),
	integrationId: text("integration_id")
		.notNull()
		.references(() => integrations.id, { onDelete: "cascade" }),
	type: text("type", { enum: ["trigger", "action"] }).notNull(),
	operationKey: text("operation_key").notNull(),
	name: text("name").notNull(),
	description: text("description").notNull().default(""),
	configSchema: jsonb("config_schema").notNull().default({}),
});

/**
 * Per-flow trigger endpoint. The path is a public-ish token URL so external
 * services can POST events into a flow. `secret` enables HMAC verification.
 */
export const webhookEndpoints = pgTable("webhook_endpoints", {
	id: uuid("id").primaryKey().defaultRandom(),
	flowId: uuid("flow_id")
		.notNull()
		.references(() => flows.id, { onDelete: "cascade" }),
	path: text("path").notNull().unique(),
	secret: text("secret").notNull(),
});

/** Encrypted credential blob keyed per-integration + name. */
export const credentials = pgTable("credentials", {
	id: uuid("id").primaryKey().defaultRandom(),
	name: text("name").notNull(),
	integrationId: text("integration_id").notNull(),
	/** Encrypted JSONB payload (AES-GCM) — decrypted only in the worker. */
	data: text("data").notNull(),
	nonce: text("nonce").notNull(),
	createdAt: timestamp("created_at", { mode: "string" }).notNull().defaultNow(),
});

export const executions = pgTable("executions", {
	id: uuid("id").primaryKey().defaultRandom(),
	flowId: uuid("flow_id")
		.notNull()
		.references(() => flows.id, { onDelete: "cascade" }),
	triggerData: jsonb("trigger_data").notNull().default({}),
	status: text("status", {
		enum: ["running", "success", "failed", "cancelled"],
	})
		.notNull()
		.default("running"),
	createdAt: timestamp("created_at", { mode: "string" }).notNull().defaultNow(),
	startedAt: timestamp("started_at", { mode: "string" }),
	finishedAt: timestamp("finished_at", { mode: "string" }),
});

export const executionSteps = pgTable("execution_steps", {
	id: uuid("id").primaryKey().defaultRandom(),
	executionId: uuid("execution_id")
		.notNull()
		.references(() => executions.id, { onDelete: "cascade" }),
	nodeId: uuid("node_id").notNull(),
	operationKey: text("operation_key").notNull(),
	status: text("status", {
		enum: ["pending", "running", "success", "failed", "skipped", "cancelled"],
	})
		.notNull()
		.default("pending"),
	config: jsonb("config").notNull().default({}),
	input: jsonb("input").notNull().default({}),
	output: jsonb("output"),
	error: jsonb("error"),
	startedAt: timestamp("started_at", { mode: "string" }),
	finishedAt: timestamp("finished_at", { mode: "string" }),
});

/** Convenience namespace so callers can do `import { schema } from "@flowforge/db"`
 *  and pass it straight to `drizzle(client, { schema })`. */
export const schema = {
	flows,
	flowNodes,
	flowEdges,
	integrations,
	nodeOperations,
	webhookEndpoints,
	credentials,
	executions,
	executionSteps,
} as const;
