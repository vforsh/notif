import { test, expect, beforeEach, afterEach, mock } from "bun:test";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { writeConfig } from "./config.ts";

let originalXDG: string | undefined;
let tempDir: string;
let originalFetch: typeof globalThis.fetch;

function mockFetch(handler: (url: string, init: RequestInit) => void) {
	const fn = mock(async (input: string | URL | Request, init?: RequestInit) => {
		handler(String(input), init || {});
		return new Response(JSON.stringify({ id: "abc123", time: 1, expires: 2, event: "message", topic: "test-topic" }), {
			status: 200,
			headers: { "Content-Type": "application/json" },
		});
	});
	globalThis.fetch = Object.assign(fn, { preconnect: globalThis.fetch.preconnect }) as typeof fetch;
}

function mockFetchError(status: number, body: string) {
	const fn = mock(async () => new Response(body, { status }));
	globalThis.fetch = Object.assign(fn, { preconnect: globalThis.fetch.preconnect }) as typeof fetch;
}

beforeEach(async () => {
	originalXDG = process.env.XDG_CONFIG_HOME;
	tempDir = join(tmpdir(), `notif-test-${Date.now()}`);
	process.env.XDG_CONFIG_HOME = tempDir;
	originalFetch = globalThis.fetch;

	await writeConfig({
		server: "https://ntfy.test.local",
		topic: "test-topic",
	});
});

afterEach(async () => {
	globalThis.fetch = originalFetch;
	if (originalXDG !== undefined) {
		process.env.XDG_CONFIG_HOME = originalXDG;
	} else {
		delete process.env.XDG_CONFIG_HOME;
	}
	delete process.env.NOTIF_SERVER;
	delete process.env.NOTIF_TOPIC;
	await Bun.$`rm -rf ${tempDir}`.quiet().nothrow();
});

test("publish sends JSON POST to server base URL", async () => {
	let capturedUrl = "";
	let capturedBody: Record<string, unknown> = {};

	mockFetch((url, init) => {
		capturedUrl = url;
		capturedBody = JSON.parse(init.body as string);
	});

	const { publish } = await import("./publish.ts");
	const result = await publish("hello world", {});

	expect(capturedUrl).toBe("https://ntfy.test.local");
	expect(capturedBody.topic).toBe("test-topic");
	expect(capturedBody.message).toBe("hello world");
	expect(result.id).toBe("abc123");
});

test("publish includes all options in JSON body", async () => {
	let capturedBody: Record<string, unknown> = {};

	mockFetch((_url, init) => {
		capturedBody = JSON.parse(init.body as string);
	});

	const { publish } = await import("./publish.ts");
	await publish("msg", {
		title: "My Title",
		priority: "high",
		tags: "warning,skull",
		click: "https://example.com",
		markdown: true,
	});

	expect(capturedBody.title).toBe("My Title");
	expect(capturedBody.priority).toBe("high");
	expect(capturedBody.tags).toEqual(["warning", "skull"]);
	expect(capturedBody.click).toBe("https://example.com");
	expect(capturedBody.markdown).toBe(true);
});

test("publish uses Bearer auth when token is set", async () => {
	let capturedHeaders: Record<string, string> = {};

	mockFetch((_url, init) => {
		capturedHeaders = Object.fromEntries(Object.entries(init.headers || {}));
	});

	const { publish } = await import("./publish.ts");
	await publish("msg", { token: "tk_abc" });

	expect(capturedHeaders["Authorization"]).toBe("Bearer tk_abc");
});

test("publish throws on missing server", async () => {
	await writeConfig({});
	const { publish } = await import("./publish.ts");
	expect(publish("msg", {})).rejects.toThrow("No server configured");
});

test("publish throws on HTTP error", async () => {
	mockFetchError(401, "Unauthorized");
	const { publish } = await import("./publish.ts");
	expect(publish("msg", {})).rejects.toThrow("ntfy error 401");
});

test("env vars override config", async () => {
	let capturedBody: Record<string, unknown> = {};

	process.env.NOTIF_SERVER = "https://env.server.com";
	process.env.NOTIF_TOPIC = "env-topic";

	mockFetch((_url, init) => {
		capturedBody = JSON.parse(init.body as string);
	});

	const { publish } = await import("./publish.ts");
	await publish("msg", {});

	expect(capturedBody.topic).toBe("env-topic");
});

test("CLI flags override env and config", async () => {
	let capturedUrl = "";
	let capturedBody: Record<string, unknown> = {};

	process.env.NOTIF_SERVER = "https://env.server.com";
	process.env.NOTIF_TOPIC = "env-topic";

	mockFetch((url, init) => {
		capturedUrl = url;
		capturedBody = JSON.parse(init.body as string);
	});

	const { publish } = await import("./publish.ts");
	await publish("msg", { server: "https://flag.server.com", topic: "flag-topic" });

	expect(capturedUrl).toBe("https://flag.server.com");
	expect(capturedBody.topic).toBe("flag-topic");
});

test("publish handles UTF-8 title correctly", async () => {
	let capturedBody: Record<string, unknown> = {};

	mockFetch((_url, init) => {
		capturedBody = JSON.parse(init.body as string);
	});

	const { publish } = await import("./publish.ts");
	await publish("Привет мир", { title: "Тест — уведомление" });

	expect(capturedBody.title).toBe("Тест — уведомление");
	expect(capturedBody.message).toBe("Привет мир");
});
