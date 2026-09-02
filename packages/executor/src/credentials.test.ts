import { createHmac } from "node:crypto";
import { beforeAll, describe, expect, it } from "vitest";
import { decryptValue, encryptValue, verifyHmac } from "./credentials.js";

beforeAll(() => {
	process.env["CREDENTIAL_ENCRYPTION_KEY"] =
		"0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
});

describe("encryptValue / decryptValue", () => {
	it("round-trips a JSON value", () => {
		const value = { apiKey: "secret-123", nested: { n: 42 } };
		const blob = encryptValue(value);
		expect(blob.data).toBeTruthy();
		expect(blob.nonce).toBeTruthy();
		expect(decryptValue(blob)).toEqual(value);
	});

	it("produces distinct ciphertext for the same plaintext", () => {
		const a = encryptValue({ k: "v" });
		const b = encryptValue({ k: "v" });
		expect(a.data).not.toBe(b.data);
		expect(a.nonce).not.toBe(b.nonce);
	});

	it("throws when the key is not set", () => {
		const prev = process.env["CREDENTIAL_ENCRYPTION_KEY"];
		delete process.env["CREDENTIAL_ENCRYPTION_KEY"];
		expect(() => encryptValue("x")).toThrow(
			/CREDENTIAL_ENCRYPTION_KEY is not set/,
		);
		process.env["CREDENTIAL_ENCRYPTION_KEY"] = prev;
	});
});

describe("verifyHmac", () => {
	it("produces the expected sha256 hmac hex digest", () => {
		const payload = Buffer.from('{"hello":"world"}', "utf8");
		const expected = createHmac("sha256", "sekrit")
			.update(payload)
			.digest("hex");
		expect(verifyHmac("sekrit", payload)).toBe(expected);
	});

	it("differs for different secrets", () => {
		const payload = Buffer.from("body");
		expect(verifyHmac("a", payload)).not.toBe(verifyHmac("b", payload));
	});
});
