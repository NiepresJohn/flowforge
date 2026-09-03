import { randomUUID } from "node:crypto";
import type { NextFunction, Request, Response } from "express";

/** Header name for request correlation */
export const REQUEST_ID_HEADER = "x-request-id";

/** Attach a unique request ID to every incoming request. */
export function requestId(
	req: Request,
	res: Response,
	next: NextFunction,
): void {
	const id = req.header(REQUEST_ID_HEADER) ?? randomUUID();
	res.setHeader(REQUEST_ID_HEADER, id);
	next();
}
