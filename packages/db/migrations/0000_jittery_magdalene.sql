CREATE TABLE "credentials" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"integration_id" text NOT NULL,
	"data" text NOT NULL,
	"nonce" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "execution_steps" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"execution_id" uuid NOT NULL,
	"node_id" uuid NOT NULL,
	"operation_key" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"config" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"input" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"output" jsonb,
	"error" jsonb,
	"started_at" timestamp,
	"finished_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "executions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"flow_id" uuid NOT NULL,
	"trigger_data" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"status" text DEFAULT 'running' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"started_at" timestamp,
	"finished_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "flow_edges" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"flow_id" uuid NOT NULL,
	"source_node_id" uuid NOT NULL,
	"target_node_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "flow_nodes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"flow_id" uuid NOT NULL,
	"type" text NOT NULL,
	"integration_id" text NOT NULL,
	"operation_key" text NOT NULL,
	"config" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"position_x" text DEFAULT '0' NOT NULL,
	"position_y" text DEFAULT '0' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "flows" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"active" boolean DEFAULT false NOT NULL,
	"trigger_type" text DEFAULT 'webhook' NOT NULL,
	"trigger_node_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "integrations" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"icon" text DEFAULT '🔌' NOT NULL,
	"version" text DEFAULT '0.0.0' NOT NULL,
	"author" text DEFAULT '' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "node_operations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"integration_id" text NOT NULL,
	"type" text NOT NULL,
	"operation_key" text NOT NULL,
	"name" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"config_schema" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "webhook_endpoints" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"flow_id" uuid NOT NULL,
	"path" text NOT NULL,
	"secret" text NOT NULL,
	CONSTRAINT "webhook_endpoints_path_unique" UNIQUE("path")
);
--> statement-breakpoint
ALTER TABLE "execution_steps" ADD CONSTRAINT "execution_steps_execution_id_executions_id_fk" FOREIGN KEY ("execution_id") REFERENCES "public"."executions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "executions" ADD CONSTRAINT "executions_flow_id_flows_id_fk" FOREIGN KEY ("flow_id") REFERENCES "public"."flows"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "flow_edges" ADD CONSTRAINT "flow_edges_flow_id_flows_id_fk" FOREIGN KEY ("flow_id") REFERENCES "public"."flows"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "flow_nodes" ADD CONSTRAINT "flow_nodes_flow_id_flows_id_fk" FOREIGN KEY ("flow_id") REFERENCES "public"."flows"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "node_operations" ADD CONSTRAINT "node_operations_integration_id_integrations_id_fk" FOREIGN KEY ("integration_id") REFERENCES "public"."integrations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webhook_endpoints" ADD CONSTRAINT "webhook_endpoints_flow_id_flows_id_fk" FOREIGN KEY ("flow_id") REFERENCES "public"."flows"("id") ON DELETE cascade ON UPDATE no action;