import { defineConfig } from "@playwright/test";

export default defineConfig({
	testDir: ".",
	testMatch: "**/*.spec.ts",
	// The web app is served on :80 by nginx, which reverse-proxies /api and
	// /ws to the API container (see docker-compose.yml). The stack is
	// expected to be running via `docker compose up --build` before e2e runs.
	use: {
		baseURL: process.env["E2E_BASE_URL"] ?? "http://localhost",
	},
	webServer: process.env["E2E_WEB_SERVER"]
		? {
				command: process.env["E2E_WEB_SERVER"],
				url: process.env["E2E_BASE_URL"] ?? "http://localhost",
				reuseExistingServer: true,
				timeout: 60_000,
			}
		: undefined,
	reporter: "list",
});
