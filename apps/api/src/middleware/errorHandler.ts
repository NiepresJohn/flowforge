import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";

/**
 * Global error handler — converts thrown errors into consistent JSON responses.
 * Must be registered last so it catches errors from all routes via next(err).
 */
export function errorHandler(
	err: unknown,
	req: Request,
	res: Response,
	_next: NextFunction,
): void {
	// Validation errors from Zod
	if (err instanceof ZodError) {
		res.status(400).json({
			error: "validation_error",
			message: "Request validation failed",
			details: err.issues.map((issue) => ({
				path: issue.path.join("."),
				message: issue.message,
			})),
		});
		return;
	}

	// Known application errors with status codes
	if (err instanceof AppError) {
		res.status(err.statusCode).json({
			error: err.code,
			message: err.message,
		});
		return;
	}

	// Log unexpected errors for debugging
	console.error("[error]", req.method, req.path, err);

	// Internal server error — don't leak details to client
	res.status(500).json({
		error: "internal_error",
		message: "An unexpected error occurred",
	});
}

/** Application error with HTTP status code and error code. */
export class AppError extends Error {
	constructor(
		public readonly statusCode: number,
		public readonly code: string,
		message: string,
	) {
		super(message);
		this.name = "AppError";
	}
}

/** Common error helpers */
export const NotFound = (message = "Resource not found") =>
	new AppError(404, "not_found", message);

export const BadRequest = (message = "Bad request") =>
	new AppError(400, "bad_request", message);

export const Unauthorized = (message = "Unauthorized") =>
	new AppError(401, "unauthorized", message);

export const Conflict = (message = "Resource already exists") =>
	new AppError(409, "conflict", message);
