import { test, expect, beforeEach, afterEach } from "bun:test";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { readConfig, writeConfig, isValidKey, type Config } from "./config.ts";

let originalXDG: string | undefined;
let tempDir: string;

beforeEach(async () => {
	originalXDG = process.env.XDG_CONFIG_HOME;
	tempDir = join(tmpdir(), `notif-test-${Date.now()}`);
	process.env.XDG_CONFIG_HOME = tempDir;
});

afterEach(async () => {
	if (originalXDG !== undefined) {
		process.env.XDG_CONFIG_HOME = originalXDG;
	} else {
		delete process.env.XDG_CONFIG_HOME;
	}
	await Bun.$`rm -rf ${tempDir}`.quiet().nothrow();
});

test("readConfig returns empty object when no config file", async () => {
	const config = await readConfig();
	expect(config).toEqual({});
});

test("writeConfig + readConfig roundtrip", async () => {
	const config: Config = {
		server: "https://ntfy.example.com",
		topic: "test-topic",
	};
	await writeConfig(config);
	const read = await readConfig();
	expect(read).toEqual(config);
});

test("writeConfig preserves all fields", async () => {
	const config: Config = {
		server: "https://ntfy.example.com",
		topic: "test",
		user: "admin:pass",
		token: "tk_abc123",
	};
	await writeConfig(config);
	const read = await readConfig();
	expect(read).toEqual(config);
});

test("isValidKey accepts valid keys", () => {
	expect(isValidKey("server")).toBe(true);
	expect(isValidKey("topic")).toBe(true);
	expect(isValidKey("user")).toBe(true);
	expect(isValidKey("token")).toBe(true);
});

test("isValidKey rejects invalid keys", () => {
	expect(isValidKey("foo")).toBe(false);
	expect(isValidKey("")).toBe(false);
	expect(isValidKey("SERVER")).toBe(false);
});
