import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
	plugins: [react()],
	test: {
		environment: "happy-dom",
		setupFiles: ["./src/test/setup.ts"],
		globals: false,
		// React 19.2 only ships `React.act` in its development build, which
		// @testing-library/react relies on. Pin NODE_ENV so vitest resolves
		// the dev entry regardless of the ambient environment.
		env: { NODE_ENV: "development" },
	},
});
