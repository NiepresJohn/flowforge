import { credentials, getDb } from "@flowforge/db";
import { encryptValue } from "@flowforge/executor";
import { eq } from "drizzle-orm";
import { Router } from "express";
import { z } from "zod";

const db = getDb();
const router = Router();

const createSchema = z.object({
	name: z.string().min(1),
	integrationId: z.string().min(1),
	data: z.record(z.string(), z.string()),
});

/** List all credentials (without decrypted data). */
router.get("/", async (_req, res, next) => {
	try {
		const rows = await db
			.select({
				id: credentials.id,
				name: credentials.name,
				integrationId: credentials.integrationId,
				createdAt: credentials.createdAt,
			})
			.from(credentials);
		res.json(rows);
	} catch (e) {
		next(e);
	}
});

/** Create a new credential (encrypts and stores). */
router.post("/", async (req, res, next) => {
	try {
		const { name, integrationId, data } = createSchema.parse(req.body);
		const encrypted = encryptValue(data);

		const [row] = await db
			.insert(credentials)
			.values({ name, integrationId, data: encrypted.data, nonce: encrypted.nonce })
			.returning({
				id: credentials.id,
				name: credentials.name,
				integrationId: credentials.integrationId,
				createdAt: credentials.createdAt,
			});

		res.status(201).json(row);
	} catch (e) {
		next(e);
	}
});

/** Delete a credential. */
router.delete("/:id", async (req, res, next) => {
	try {
		await db.delete(credentials).where(eq(credentials.id, req.params.id));
		res.status(204).send();
	} catch (e) {
		next(e);
	}
});

export default router;
