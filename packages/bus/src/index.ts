import { config } from "@flowforge/config";
import type { ExecutionBus, ExecutionEvent } from "@flowforge/shared";
import { Redis } from "ioredis";

/**
 * Canonical event bus channel shared by the API (subscriber/broadcaster) and
 * the worker (publisher). Kept in its own package so neither app imports the
 * other.
 */
const CHANNEL = "flowforge:exec-events";

const pub = new Redis(config.redisUrl);

/**
 * Redis-backed publisher. The worker uses this to emit execution events;
 * the API subscribes to the same channel and fans them out over WebSocket.
 */
export class RedisBus implements ExecutionBus {
	async publish(event: ExecutionEvent): Promise<void> {
		await pub.publish(CHANNEL, JSON.stringify(event));
	}

	disconnect(): void {
		pub.disconnect();
	}
}

/**
 * Create a subscriber that forwards parsed events to a callback. Used by the
 * API's WebSocket layer to push events to connected clients.
 */
export function createSubscriber(
	url: string,
	onMessage: (event: ExecutionEvent) => void,
): Redis {
	const sub = new Redis(url);
	sub.subscribe(CHANNEL, (err) => {
		if (err) console.error("[bus] subscribe failed", err);
	});
	sub.on("message", (_channel: string, message: string) => {
		try {
			onMessage(JSON.parse(message) as ExecutionEvent);
		} catch {
			// malformed event; ignore
		}
	});
	return sub;
}

export { CHANNEL };
