import { join } from "node:path";
import { homedir } from "node:os";
import { z } from "zod/v4";

const CONFIG_DIR_NAME = "notif";
const CONFIG_FILE_NAME = "config.json";

const ConfigSchema = z.object({
	server: z.url().optional(),
	topic: z.string().optional(),
	user: z.string().optional(),
	token: z.string().optional(),
	upload_provider: z.string().optional(),
	upload_path: z.string().optional(),
});

export type Config = z.infer<typeof ConfigSchema>;

const VALID_KEYS = ["server", "topic", "user", "token", "upload_provider", "upload_path"] as const;
type ConfigKey = (typeof VALID_KEYS)[number];

export function isValidKey(key: string): key is ConfigKey {
	return VALID_KEYS.includes(key as ConfigKey);
}

export function getConfigDir(): string {
	const xdg = process.env.XDG_CONFIG_HOME;
	const base = xdg || join(homedir(), ".config");
	return join(base, CONFIG_DIR_NAME);
}

export function getConfigPath(): string {
	return join(getConfigDir(), CONFIG_FILE_NAME);
}

export async function readConfig(): Promise<Config> {
	const path = getConfigPath();
	const file = Bun.file(path);
	if (!(await file.exists())) return {};

	const raw = await file.json();
	const result = ConfigSchema.safeParse(raw);
	if (!result.success) {
		throw new Error(`Invalid config: ${z.prettifyError(result.error)}`);
	}

	return result.data;
}

export async function writeConfig(config: Config): Promise<void> {
	const dir = getConfigDir();
	await Bun.$`mkdir -p ${dir}`.quiet();

	const path = getConfigPath();
	await Bun.write(path, JSON.stringify(config, null, 2) + "\n");
}

export async function setConfigValue(key: string, value: string): Promise<void> {
	if (!isValidKey(key)) {
		throw new Error(`Unknown config key: ${key}. Valid keys: ${VALID_KEYS.join(", ")}`);
	}

	if (key === "user" || key === "token") {
		throw new Error(`Secrets must be set via stdin: echo "value" | notif config set ${key}`);
	}

	const config = await readConfig();
	config[key] = value;
	await writeConfig(config);
}

export async function setConfigValueFromStdin(key: string): Promise<void> {
	if (!isValidKey(key)) {
		throw new Error(`Unknown config key: ${key}. Valid keys: ${VALID_KEYS.join(", ")}`);
	}

	const value = (await Bun.stdin.text()).trim();
	if (!value) {
		throw new Error("No value provided via stdin");
	}

	const config = await readConfig();
	config[key] = value;
	await writeConfig(config);
}

export async function unsetConfigValue(key: string): Promise<void> {
	if (!isValidKey(key)) {
		throw new Error(`Unknown config key: ${key}. Valid keys: ${VALID_KEYS.join(", ")}`);
	}

	const config = await readConfig();
	delete config[key];
	await writeConfig(config);
}
