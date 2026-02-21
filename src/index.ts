import pc from "picocolors";
import { buildProgram } from "./cli/program.ts";

export async function main(argv: string[]) {
	const program = buildProgram();

	try {
		await program.parseAsync(argv);
	} catch (err) {
		const message = err instanceof Error ? err.message : String(err);

		if (program.opts().json) {
			console.log(JSON.stringify({ error: { message, exitCode: 1 } }));
		} else {
			console.error(pc.red(message));
		}

		process.exit(1);
	}
}
