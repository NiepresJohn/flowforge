import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// Dev proxy: forward /api and /ws to the API service so the browser can run
// the web app on a different port without CORS issues. In production a reverse
// proxy (or docker-compose networking) serves both on the same origin.
export default defineConfig({
	plugins: [react()],
	server: {
		port: 5173,
		proxy: {
			"/api": { target: "http://localhost:4000", changeOrigin: true },
			"/ws": { target: "http://localhost:4000", ws: true },
		},
	},
});
