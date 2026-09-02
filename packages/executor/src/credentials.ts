import {
	createCipheriv,
	createDecipheriv,
	createHash,
	createHmac,
	randomBytes,
} from "node:crypto";
import type { Db } from "@flowforge/db";
import { credentials } from "@flowforge/db";
import { eq } from "drizzle-orm";

/**
 * Master key (32 bytes, hex). In production this would live in a KMS/secrets
 * manager; here it's a single env var for self-hosted simplicity.
 */
function masterKey(): Buffer {
	const raw = process.env["CREDENTIAL_ENCRYPTION_KEY"];
	if (!raw) {
		throw new Error("CREDENTIAL_ENCRYPTION_KEY is not set");
	}
	// Accept either a 64-char hex string or a passphrase (hashed to 32 bytes).
	const buf = Buffer.from(raw, "hex");
	if (buf.length === 32) return buf;
	return createHash("sha256").update(raw).digest();
}

export interface EncryptedBlob {
	data: string; // base64 ciphertext+tag
	nonce: string; // base64
}

/** Encrypt a JSON-serializable value. */
export function encryptValue(value: unknown): EncryptedBlob {
	const key = masterKey();
	const nonce = randomBytes(12);
	const cipher = makeCipher(key, nonce);
	const plaintext = Buffer.from(JSON.stringify(value), "utf8");
	const encrypted = Buffer.concat([
		cipher.update(plaintext),
		cipher.final(),
		cipher.getAuthTag(),
	]);
	return {
		data: encrypted.toString("base64"),
		nonce: nonce.toString("base64"),
	};
}

/** AES-256-GCM encrypt the JSON-serialized value, appending the auth tag. */
function makeCipher(key: Buffer, nonce: Buffer) {
	return createCipheriv("aes-256-gcm", key, nonce);
}

/** Decrypt a JSON value back to its original shape. */
export function decryptValue<T = unknown>(blob: EncryptedBlob): T {
	const key = masterKey();
	const decipher = createDecipheriv(
		"aes-256-gcm",
		key,
		Buffer.from(blob.nonce, "base64"),
	);
	const raw = Buffer.from(blob.data, "base64");
	const tag = raw.subarray(raw.length - 16);
	const ciphertext = raw.subarray(0, raw.length - 16);
	decipher.setAuthTag(tag);
	const decrypted = Buffer.concat([
		decipher.update(ciphertext),
		decipher.final(),
	]);
	return JSON.parse(decrypted.toString("utf8")) as T;
}

/**
 * Resolve the secrets a node needs. A node's `config` may contain a
 * `credentials: [{ id }]` array referencing rows in the `credentials` table.
 * We load and decrypt each, flattening their fields into a single map keyed
 * by `${integrationId}:${credentialName}`.
 */
export async function resolveCreds(
	db: Db,
	integrationId: string,
	nodeConfig: Record<string, unknown>,
): Promise<Record<string, string>> {
	const refs = (nodeConfig["credentials"] ?? []) as
		| Array<{ id: string }>
		| undefined;
	if (!refs || refs.length === 0) return {};

	const out: Record<string, string> = {};
	for (const ref of refs) {
		const rows = await db
			.select()
			.from(credentials)
			.where(eq(credentials.id, ref.id));
		const row = rows[0];
		if (!row) continue;
		const values = decryptValue<Record<string, string>>({
			data: row.data,
			nonce: row.nonce,
		});
		for (const [k, v] of Object.entries(values)) {
			out[`${integrationId}:${k}`] = v;
		}
	}
	return out;
}

/** Verify an HMAC webhook signature so triggers can prove authenticity. */
export function verifyHmac(secret: string, payload: Buffer): string {
	return createHmac("sha256", secret).update(payload).digest("hex");
}
