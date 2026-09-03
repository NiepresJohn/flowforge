import { createServer } from "node:http";
import { createSubscriber } from "@flowforge/bus";
import { config } from "@flowforge/config";
import type { ExecutionEvent } from "@flowforge/shared";
import cors from "cors";
import express from "express";
import { WebSocket, WebSocketServer } from "ws";
import { apiKeyAuth } from "./middleware/auth.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { requestId } from "./middleware/requestId.js";
import { securityMiddleware } from "./middleware/security.js";
import credentialsRouter from "./routes/credentials.js";
import executionsRouter from "./routes/executions.js";
import flowsRouter from "./routes/flows.js";
import healthRouter from "./routes/health.js";
import integrationsRouter from "./routes/integrations.js";
import nodesRouter from "./routes/nodes.js";
import webhooksRouter from "./routes/webhooks.js";

const app = express();

app.use(requestId);
app.use(securityMiddleware);
app.use(cors({ origin: "*" }));
// Webhooks need the raw body for HMAC verification, so parse them as raw text
// before the global JSON parser consumes the stream.
app.use("/webhook", express.raw({ type: "*/*", limit: "1mb" }));
app.use(express.json({ limit: "1mb" }));
app.use(apiKeyAuth);

app.use("/healthz", healthRouter);
app.use("/api/credentials", credentialsRouter);
app.use("/api/flows", flowsRouter);
app.use("/api/flows", nodesRouter);
app.use("/api/flows", executionsRouter);
app.use("/api/integrations", integrationsRouter);
app.use("/webhook", webhooksRouter);

// Global error handler — must be last
app.use(errorHandler);

const httpServer = createServer(app);

/**
 * WebSocket live monitor. Clients subscribe to an execution with:
 *   { "type": "subscribe", "executionId": "<uuid>" }
 * We broadcast execution lifecycle + step events as they occur.
 */
const wss = new WebSocketServer({ server: httpServer, path: "/ws" });

/** Track subscriptions per socket for O(1) cleanup on disconnect */
const subscriptions = new Map<WebSocket, Set<string>>();

wss.on("connection", (socket) => {
	subscriptions.set(socket, new Set());
	socket.on("message", (raw) => {
		try {
			const msg = JSON.parse(raw.toString());
			if (msg.type === "subscribe" && typeof msg.executionId === "string") {
				subscriptions.get(socket)?.add(msg.executionId);
			}
		} catch {
			socket.close(4400, "invalid message");
		}
	});
	socket.on("close", () => {
		subscriptions.delete(socket);
	});
});

/** Fan a parsed bus event to all sockets subscribed to that executionId or jobId. */
function broadcast(event: ExecutionEvent) {
	for (const [socket, executionIds] of subscriptions) {
		const matched =
			executionIds.has(event.executionId) ||
			(event.jobId !== undefined && executionIds.has(event.jobId));
		if (matched && socket.readyState === WebSocket.OPEN) {
			socket.send(JSON.stringify(event));
		}
	}
}

// Redis subscriber: the worker publishes here, we forward to WS clients.
// Kept referenced so the connection isn't GC'd for the process lifetime.
const redisSub = createSubscriber(config.redisUrl, broadcast);

let shuttingDown = false;

export function shutdown(): void {
	if (shuttingDown) return;
	shuttingDown = true;

	// Stop accepting new connections.
	httpServer.close(() => {
		console.log("[api] http server closed");
	});

	// Close all WebSocket connections.
	for (const client of wss.clients) {
		client.close(1001, "server shutting down");
	}

	// Give in-flight requests a moment, then exit.
	setTimeout(() => {
		console.log("[api] shutdown complete");
		process.exit(0);
	}, 5000);
}

export { app, httpServer, redisSub, wss };
