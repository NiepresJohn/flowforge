import { listManifests } from "@flowforge/integrations";
import { Router } from "express";

const router = Router();

/** Catalog of available integrations + their trigger/action definitions.
 *  The editor uses this to populate the node palette. */
router.get("/", (_req, res, next) => {
	try {
		res.json(listManifests());
	} catch (e) {
		next(e);
	}
});

router.get("/:id", (req, res, next) => {
	try {
		const manifest = listManifests().find((m) => m.id === req.params.id);
		if (!manifest) {
			res.status(404).json({ error: "integration not found" });
			return;
		}
		res.json(manifest);
	} catch (e) {
		next(e);
	}
});

export default router;
