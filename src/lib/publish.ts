import { readConfig } from "./config.ts";
import { getStorageProvider, buildRemotePath } from "./storage.ts";

export interface PublishOptions {
	server?: string;
	topic?: string;
	title?: string;
	priority?: string;
	tags?: string;
	click?: string;
	icon?: string;
	attach?: string;
	filename?: string;
	delay?: string;
	email?: string;
	actions?: string;
	markdown?: boolean;
	noCache?: boolean;
	noFirebase?: boolean;
	sequenceId?: string;
	file?: string;
	uploadProvider?: string;
	uploadPath?: string;
	user?: string;
	token?: string;
}

export interface PublishResult {
	id: string;
	time: number;
	expires: number;
	event: string;
	topic: string;
	message?: string;
	title?: string;
	priority?: number;
	tags?: string[];
	[key: string]: unknown;
}

export async function publish(message: string | undefined, opts: PublishOptions): Promise<PublishResult> {
	const config = await readConfig();

	const server = opts.server || process.env.NOTIF_SERVER || config.server;
	const topic = opts.topic || process.env.NOTIF_TOPIC || config.topic;
	const user = opts.user || process.env.NOTIF_USER || config.user;
	const token = opts.token || process.env.NOTIF_TOKEN || config.token;

	if (!server) {
		throw new Error("No server configured. Run: notif config set server https://ntfy.example.com");
	}
	if (!topic) {
		throw new Error("No topic configured. Run: notif config set topic my-topic");
	}

	const baseUrl = server.replace(/\/+$/, "");
	const authHeaders: Record<string, string> = {};

	if (token) {
		authHeaders["Authorization"] = `Bearer ${token}`;
	} else if (user) {
		authHeaders["Authorization"] = `Basic ${btoa(user)}`;
	}

	// File upload via external storage provider → attach URL
	if (opts.file) {
		const file = Bun.file(opts.file);
		if (!(await file.exists())) {
			throw new Error(`File not found: ${opts.file}`);
		}

		const uploadProvider = opts.uploadProvider || process.env.NOTIF_UPLOAD_PROVIDER || config.upload_provider;
		if (!uploadProvider) {
			throw new Error("No storage provider configured. Run: notif config set upload_provider yadisk");
		}

		const uploadPath = opts.uploadPath || process.env.NOTIF_UPLOAD_PATH || config.upload_path || "/uploads/notif-cli";
		const remotePath = buildRemotePath(uploadPath, opts.file, opts.filename);
		const provider = getStorageProvider(uploadProvider);
		const publicUrl = await provider.upload(opts.file, remotePath);

		if (!opts.click) opts.click = publicUrl;
	}

	// Regular message via JSON body (supports UTF-8 in all fields)
	const body: Record<string, unknown> = { topic };
	if (message) body.message = message;
	if (opts.title) body.title = opts.title;
	if (opts.priority) body.priority = isNaN(Number(opts.priority)) ? opts.priority : Number(opts.priority);
	if (opts.tags) body.tags = opts.tags.split(",").map((t) => t.trim());
	if (opts.click) body.click = opts.click;
	if (opts.icon) body.icon = opts.icon;
	if (opts.attach) body.attach = opts.attach;
	if (opts.filename) body.filename = opts.filename;
	if (opts.delay) body.delay = opts.delay;
	if (opts.email) body.email = opts.email;
	if (opts.actions) body.actions = opts.actions;
	if (opts.markdown) body.markdown = true;
	if (opts.noCache) body.cache = "no";
	if (opts.noFirebase) body.firebase = "no";
	if (opts.sequenceId) body["x-sequence-id"] = opts.sequenceId;

	const resp = await fetch(baseUrl, {
		method: "POST",
		headers: { "Content-Type": "application/json", ...authHeaders },
		body: JSON.stringify(body),
	});

	if (!resp.ok) {
		const text = await resp.text();
		throw new Error(`ntfy error ${resp.status}: ${text}`);
	}

	return (await resp.json()) as PublishResult;
}
