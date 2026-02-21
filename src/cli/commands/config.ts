import { Command } from "commander";
import pc from "picocolors";
import {
	getConfigPath,
	readConfig,
	writeConfig,
	setConfigValue,
	setConfigValueFromStdin,
	unsetConfigValue,
	type Config,
} from "../../lib/config.ts";

const SECRET_KEYS = new Set(["user", "token"]);

function redact(key: string, value: string): string {
	return SECRET_KEYS.has(key) ? "*".repeat(Math.min(value.length, 12)) : value;
}

async function prompt(label: string, current?: string, secret = false): Promise<string | undefined> {
	const suffix = current ? pc.dim(` [${secret ? "****" : current}]`) : "";
	process.stderr.write(`${label}${suffix}: `);

	for await (const chunk of Bun.stdin.stream()) {
		const line = new TextDecoder().decode(chunk).trim();
		return line || current;
	}

	return current;
}

export function registerConfigCommand(program: Command) {
	const config = program
		.command("config")
		.alias("cfg")
		.description("Manage notif configuration");

	config
		.command("ls")
		.description("Print config path and contents")
		.action(async () => {
			const path = getConfigPath();
			console.log(pc.dim(path));

			const cfg = await readConfig();
			if (Object.keys(cfg).length === 0) {
				console.log(pc.dim("(empty)"));
				return;
			}

			for (const [key, value] of Object.entries(cfg)) {
				if (value !== undefined) {
					console.log(`${key}: ${redact(key, value)}`);
				}
			}
		});

	config
		.command("init")
		.description("Interactively configure notif")
		.action(async () => {
			if (!process.stdin.isTTY) {
				console.error(pc.red("cfg init requires a TTY"));
				process.exit(1);
			}

			const current = await readConfig();
			console.error(pc.bold("notif config") + pc.dim(" (Enter to keep current value, empty to clear)\n"));

			const server = await prompt("server", current.server);
			const topic = await prompt("topic", current.topic);
			const upload_provider = await prompt("upload_provider", current.upload_provider);
			const upload_path = await prompt("upload_path", current.upload_path);
			const user = await prompt("user", current.user, true);
			const token = await prompt("token", current.token, true);

			const updated: Config = {};
			if (server) updated.server = server;
			if (topic) updated.topic = topic;
			if (upload_provider) updated.upload_provider = upload_provider;
			if (upload_path) updated.upload_path = upload_path;
			if (user) updated.user = user;
			if (token) updated.token = token;

			await writeConfig(updated);
			console.error(pc.green("\nSaved"), pc.dim(getConfigPath()));
		});

	config
		.command("path")
		.description("Print config file path")
		.action(() => {
			console.log(getConfigPath());
		});

	config
		.command("get")
		.description("Print current config values")
		.action(async () => {
			const cfg = await readConfig();
			if (Object.keys(cfg).length === 0) {
				console.error(pc.dim("(empty config)"));
				return;
			}

			for (const [key, value] of Object.entries(cfg)) {
				if (value !== undefined) {
					console.log(`${key}: ${redact(key, value)}`);
				}
			}
		});

	config
		.command("set")
		.description("Set a config value")
		.argument("<key>", "Config key (server, topic, user, token)")
		.argument("[value]", "Value (omit for secrets — pipe via stdin)")
		.action(async (key: string, value: string | undefined) => {
			if (SECRET_KEYS.has(key)) {
				if (value) {
					console.error(pc.yellow(`Secrets must be set via stdin:`));
					console.error(pc.dim(`  echo "value" | notif cfg set ${key}`));
					process.exit(1);
				}
				await setConfigValueFromStdin(key);
			} else {
				if (!value) {
					console.error(pc.red(`Value required for ${key}`));
					process.exit(1);
				}
				await setConfigValue(key, value);
			}
			console.error(pc.green(`Set ${key}`));
		});

	config
		.command("unset")
		.description("Remove a config value")
		.argument("<key>", "Config key to remove")
		.action(async (key: string) => {
			await unsetConfigValue(key);
			console.error(pc.green(`Unset ${key}`));
		});
}
