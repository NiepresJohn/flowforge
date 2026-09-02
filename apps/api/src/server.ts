import { createServer } from "node:http";
import { createSubscriber } from "@flowforge/bus";
import { config } from "@flowforge/config";
import type { ExecutionEvent } from "@flowforge/shared";
import cors from "cors";
import express from "express";
import { WebSocket, WebSocketServer } from "ws";
import executionsRouter from "./routes/executions.js";
import flowsRouter from "./routes/flows.js";
import integrationsRouter from "./routes/integrations.js";
import nodesRouter from "./routes/nodes.js";
import webhooksRouter from "./routes/webhooks.js";

const app = express();

app.use(cors({ origin: "*" }));
// Webhooks need the raw body for HMAC verification, so parse them as raw text
// before the global JSON parser consumes the stream.
app.use("/webhook", express.raw({ type: "*/*" }));
app.use(express.json());

app.use("/api/flows", flowsRouter);
app.use("/api/flows", nodesRouter);
app.use("/api/flows", executionsRouter);
app.use("/api/integrations", integrationsRouter);
app.use("/webhook", webhooksRouter);

app.get("/healthz", (_req, res) => res.json({ status: "ok" }));

const httpServer = createServer(app);

/**
 * WebSocket live monitor. Clients subscribe to an execution with:
 *   { "type": "subscribe", "executionId": "<uuid>" }
 * We broadcast execution lifecycle + step events as they occur.
 */
const wss = new WebSocketServer({ server: httpServer, path: "/ws" });

interface Subscription {
	socket: WebSocket;
	executionId: string;
}

const subscriptions: Subscription[] = [];

wss.on("connection", (socket) => {
	socket.on("message", (raw) => {
		try {
			const msg = JSON.parse(raw.toString());
			if (msg.type === "subscribe" && typeof msg.executionId === "string") {
				subscriptions.push({ socket, executionId: msg.executionId });
			}
		} catch {
			socket.close(4400, "invalid message");
		}
	});
	socket.on("close", () => {
		for (let i = subscriptions.length - 1; i >= 0; i--) {
			const sub = subscriptions[i];
			if (sub && sub.socket === socket) subscriptions.splice(i, 1);
		}
	});
});

/** Fan a parsed bus event to all sockets subscribed to that executionId or jobId. */
function broadcast(event: ExecutionEvent) {
	for (const sub of subscriptions) {
		const matched =
			sub.executionId === event.executionId ||
			(event.jobId !== undefined && sub.executionId === event.jobId);
		if (matched && sub.socket.readyState === WebSocket.OPEN) {
			sub.socket.send(JSON.stringify(event));
		}
	}
}

// Redis subscriber: the worker publishes here, we forward to WS clients.
// Kept referenced so the connection isn't GC'd for the process lifetime.
const redisSub = createSubscriber(config.redisUrl, broadcast);

export { app, httpServer, redisSub, wss };
