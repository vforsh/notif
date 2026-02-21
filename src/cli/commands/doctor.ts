import { Command } from "commander";
import pc from "picocolors";
import { getConfigPath, readConfig } from "../../lib/config.ts";

const PASS = pc.green("OK");
const FAIL = pc.red("FAIL");
const WARN = pc.yellow("WARN");

interface CheckResult {
	status: "pass" | "fail" | "warn";
	detail: string;
	hint?: string;
}

interface Check {
	name: string;
	run: () => Promise<CheckResult>;
}

const checks: Check[] = [
	{
		name: "Config file",
		run: async () => {
			const path = getConfigPath();
			const file = Bun.file(path);
			if (!(await file.exists())) {
				return { status: "fail", detail: `not found: ${path}`, hint: "notif cfg init" };
			}

			try {
				await readConfig();
				return { status: "pass", detail: path };
			} catch (err) {
				return {
					status: "fail",
					detail: err instanceof Error ? err.message : String(err),
					hint: `Fix or delete ${path}, then run: notif cfg init`,
				};
			}
		},
	},
	{
		name: "Server",
		run: async () => {
			const cfg = await readConfig();
			const server = process.env.NOTIF_SERVER || cfg.server;
			if (!server) {
				return { status: "fail", detail: "not configured", hint: "notif cfg set server https://ntfy.example.com" };
			}
			return { status: "pass", detail: server };
		},
	},
	{
		name: "Topic",
		run: async () => {
			const cfg = await readConfig();
			const topic = process.env.NOTIF_TOPIC || cfg.topic;
			if (!topic) {
				return { status: "fail", detail: "not configured", hint: "notif cfg set topic my-topic" };
			}
			return { status: "pass", detail: topic };
		},
	},
	{
		name: "Auth",
		run: async () => {
			const cfg = await readConfig();
			const token = process.env.NOTIF_TOKEN || cfg.token;
			const user = process.env.NOTIF_USER || cfg.user;

			if (token) return { status: "pass", detail: "token" };
			if (user) {
				if (!user.includes(":")) {
					return {
						status: "warn",
						detail: "user format should be username:password",
						hint: 'echo "user:pass" | notif cfg set user',
					};
				}
				return { status: "pass", detail: "user:pass" };
			}
			return { status: "pass", detail: "none (anonymous)" };
		},
	},
	{
		name: "Storage provider",
		run: async () => {
			const cfg = await readConfig();
			const provider = process.env.NOTIF_UPLOAD_PROVIDER || cfg.upload_provider;
			if (!provider) {
				return {
					status: "warn",
					detail: "not configured (file uploads disabled)",
					hint: "notif cfg set upload_provider yadisk",
				};
			}

			const { KNOWN_PROVIDERS } = await import("../../lib/storage.ts");
			if (!KNOWN_PROVIDERS.includes(provider)) {
				return {
					status: "fail",
					detail: `unknown provider: ${provider}`,
					hint: `known providers: ${KNOWN_PROVIDERS.join(", ")}`,
				};
			}

			return { status: "pass", detail: provider };
		},
	},
	{
		name: "Server reachable",
		run: async () => {
			const cfg = await readConfig();
			const server = process.env.NOTIF_SERVER || cfg.server;
			if (!server) {
				return { status: "fail", detail: "no server to check", hint: "set server first" };
			}

			const url = `${server.replace(/\/+$/, "")}/v1/health`;
			try {
				const resp = await fetch(url, { signal: AbortSignal.timeout(5000) });
				if (!resp.ok) {
					return { status: "fail", detail: `HTTP ${resp.status}`, hint: `check server URL: ${server}` };
				}
				const body = (await resp.json()) as { healthy?: boolean };
				if (body.healthy) {
					return { status: "pass", detail: "healthy" };
				}
				return { status: "warn", detail: "responded but not healthy", hint: "check ntfy server logs" };
			} catch (err) {
				const msg = err instanceof Error ? err.message : String(err);
				return { status: "fail", detail: msg, hint: `verify server is running at ${server}` };
			}
		},
	},
];

export function registerDoctorCommand(program: Command) {
	program
		.command("doctor")
		.alias("check")
		.description("Verify notif setup")
		.action(async () => {
			let hasFailure = false;

			for (const check of checks) {
				const result = await check.run();
				const icon = result.status === "pass" ? PASS : result.status === "warn" ? WARN : FAIL;
				let line = `${icon}  ${check.name}: ${pc.dim(result.detail)}`;
				if (result.hint && result.status !== "pass") {
					line += `\n     ${pc.yellow(">")} ${result.hint}`;
				}
				console.log(line);
				if (result.status === "fail") hasFailure = true;
			}

			if (hasFailure) {
				process.exit(1);
			}
		});
}
