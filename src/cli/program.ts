import { Command } from "commander";
import { registerPubCommand } from "./commands/pub.ts";
import { registerConfigCommand } from "./commands/config.ts";
import { registerDoctorCommand } from "./commands/doctor.ts";

export function buildProgram(): Command {
	const program = new Command();

	program
		.name("notif")
		.version("0.1.0")
		.description("Send push notifications via ntfy")
		.option("--json", "Output raw JSON response")
		.option("--plain", "Output only the message ID")
		.option("-q, --quiet", "Suppress all output");

	registerPubCommand(program);
	registerConfigCommand(program);
	registerDoctorCommand(program);

	return program;
}
