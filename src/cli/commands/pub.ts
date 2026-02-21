import { Command } from "commander";
import pc from "picocolors";
import { publish, type PublishOptions } from "../../lib/publish.ts";

export function registerPubCommand(program: Command) {
	program
		.argument("[message...]", "Message to send")
		.option("-t, --title <title>", "Message title")
		.option("-p, --priority <priority>", "Priority (1=min, 2=low, 3=default, 4=high, 5=max)")
		.option("-T, --tags <tags>", "Comma-separated tags/emojis")
		.option("--click <url>", "URL to open on notification click")
		.option("--icon <url>", "Notification icon URL")
		.option("--attach <url>", "URL to send as external attachment")
		.option("--file <path>", "File to upload as attachment")
		.option("--filename <name>", "Filename for the attachment")
		.option("--delay <delay>", "Delay/schedule message (e.g. 10s, 30m, 2025-01-01T10:00:00)")
		.option("--email <email>", "Also send to email address")
		.option("--actions <actions>", "Actions JSON array or simple definition")
		.option("--md", "Treat message as Markdown")
		.option("--no-cache", "Do not cache message server-side")
		.option("--no-firebase", "Do not forward to Firebase")
		.option("--sid <id>", "Sequence ID for updating notifications")
		.option("--topic <topic>", "Override default topic")
		.option("--server <url>", "Override default server")
		.option("--user <user:pass>", "Username:password for auth")
		.option("--token <token>", "Access token for auth")
		.action(async (messageParts: string[], opts: Record<string, unknown>) => {
			let message = messageParts.join(" ") || undefined;

			// Read from stdin if no message and not a TTY
			if (!message && !process.stdin.isTTY) {
				message = (await Bun.stdin.text()).trim() || undefined;
			}

			const publishOpts: PublishOptions = {
				server: opts.server as string | undefined,
				topic: opts.topic as string | undefined,
				title: opts.title as string | undefined,
				priority: opts.priority as string | undefined,
				tags: opts.tags as string | undefined,
				click: opts.click as string | undefined,
				icon: opts.icon as string | undefined,
				attach: opts.attach as string | undefined,
				filename: opts.filename as string | undefined,
				delay: opts.delay as string | undefined,
				email: opts.email as string | undefined,
				actions: opts.actions as string | undefined,
				markdown: opts.md as boolean | undefined,
				noCache: opts.cache === false,
				noFirebase: opts.firebase === false,
				sequenceId: opts.sid as string | undefined,
				file: opts.file as string | undefined,
				user: opts.user as string | undefined,
				token: opts.token as string | undefined,
			};

			const result = await publish(message, publishOpts);

			if (program.opts().json) {
				console.log(JSON.stringify(result));
			} else if (program.opts().plain) {
				console.log(result.id);
			} else if (!program.opts().quiet) {
				console.error(pc.green("Sent"), pc.dim(result.id));
			}
		});
}
