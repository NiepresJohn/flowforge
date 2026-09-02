import type { Integration, IntegrationManifest } from "@flowforge/shared";
import { delay } from "./actions/delay.js";
import { httpRequest } from "./actions/http-request.js";
import { webhookTrigger } from "./triggers/webhook.js";

/**
 * In-memory registry of available integrations.
 *
 * For a self-hosted tool this is how we'd normally load external plugins
 * (each from ./integrations/<id>/manifest.json + built JS), but for now the
 * built-ins live here. The API imports `registry` to list available
 * operations and the worker resolves it to execute nodes.
 */
const integrations = new Map<string, Integration>();

export function register(integration: Integration): void {
	integrations.set(integration.manifest.id, integration);
}

export function getIntegration(id: string): Integration | undefined {
	return integrations.get(id);
}

export function listIntegrations(): Integration[] {
	return [...integrations.values()];
}

export function listManifests(): IntegrationManifest[] {
	return [...integrations.values()].map((i) => i.manifest);
}

// Built-ins
register(webhookTrigger);
register(httpRequest);
register(delay);
