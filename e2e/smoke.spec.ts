import { expect, test } from "@playwright/test";

/**
 * End-to-end smoke: the full stack (web :80, api, worker, postgres, redis)
 * must be running — `docker compose up --build`. Exercises the UI against
 * the live API + worker + Redis event bus.
 */

test("creates a flow, runs it, and sees the execution succeed", async ({
	page,
	request,
}) => {
	const name = `e2e-${Date.now()}`;
	let flowId: string | undefined;

	await page.goto("/");
	await expect(page.getByRole("heading", { name: "My flows" })).toBeVisible();

	// Create a flow from the home page.
	await page.getByPlaceholder("Flow name").fill(name);
	await page.getByRole("button", { name: "Create flow" }).click();

	// We should land on the flow builder at /flows/<uuid>.
	await page.waitForURL(/\/flows\/[0-9a-f-]+$/);
	flowId = page.url().split("/").pop();

	await expect(page.getByRole("button", { name: "Run flow" })).toBeVisible();

	// The builder should render the auto-created webhook trigger node.
	// React Flow renders each node with data-testid `rf__node-<id>`.
	await expect(page.locator('[data-testid^="rf__node-"]')).toHaveCount(1);
	await expect(page.getByText("webhook_received").first()).toBeVisible();

	// Kick off a manual run and watch the monitor report success. The run
	// publishes over Redis → WebSocket → ExecutionMonitor.
	await page.getByRole("button", { name: "Run flow" }).click();
	await expect(page.getByText("Execution succeeded")).toBeVisible({
		timeout: 15_000,
	});

	// Confirm the execution landed in the API.
	const res = await request.get(`/api/flows/${flowId}/executions`);
	expect(res.ok()).toBeTruthy();
	const executions = (await res.json()) as Array<{ status: string }>;
	expect(executions.length).toBeGreaterThan(0);
	expect(executions[0]?.status).toBe("success");

	// Clean up the flow we created.
	if (flowId) {
		await request.delete(`/api/flows/${flowId}`);
	}
});
