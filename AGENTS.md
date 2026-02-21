## General Rules

- **Runtime**: Bun only — `bun install`, `bun test`, `bun run`
- **Keep files small**: Under ~500 LOC. Split before adding more logic.
- **Commits**: Conventional Commits (`feat|fix|refactor|chore|docs|test`)
- **No secrets in argv**: Auth values (`user`, `token`) must come via stdin or env, never as CLI arguments

---

## Build / Test

- **Typecheck**: `bun run typecheck`
- **Test**: `bun test`
- **Run locally**: `bun run cmd` (or `bun run bin/notif`)
- **Full gate**: `bun run typecheck && bun test`
- **Link globally**: `bun link` → `notif` available machine-wide

---

## Repo Tour

- `bin/notif` — CLI entry point (`#!/usr/bin/env bun`)
- `src/index.ts` — main + error handling
- `src/cli/program.ts` — commander setup, global flags
- `src/cli/commands/pub.ts` — publish (default command)
- `src/cli/commands/config.ts` — `config`/`cfg` subcommands (ls, init, get, set, unset)
- `src/cli/commands/doctor.ts` — `doctor`/`check` health checks
- `src/lib/config.ts` — XDG config read/write (`~/.config/notif/config.json`)
- `src/lib/publish.ts` — HTTP publish via `fetch()` (JSON body mode)
- `skill/notif/SKILL.md` — consumer skill file for AI agents

---

## Architecture

- **No ntfy binary dependency** — publishes via ntfy REST API directly using `fetch()`
- **JSON body mode** for POST — avoids non-ASCII header issues, supports UTF-8 in all fields
- **File uploads** use PUT with headers (only case where headers carry metadata)
- **Config precedence**: CLI flags > env vars (`NOTIF_*`) > config file
- **Output contract**: stdout = primary data, stderr = logs/diagnostics
- **Output modes**: default (stderr summary), `--json` (raw response), `--plain` (message ID), `-q` (silent)

---

## Golden Paths

### Add a new publish flag

1. Add option to `PublishOptions` in `src/lib/publish.ts`
2. Add to JSON body construction in `publish()` function
3. Add commander option in `src/cli/commands/pub.ts`
4. Wire option value into `publishOpts` object in the action handler
5. Update `skill/notif/SKILL.md` flags table

### Add a new config key

1. Add field to `ConfigSchema` in `src/lib/config.ts`
2. Add to `VALID_KEYS` array
3. If secret: add to `SECRET_KEYS` set in `src/cli/commands/config.ts`
4. Add prompt in `cfg init` action

### Add a new subcommand

1. Create `src/cli/commands/<name>.ts` with `registerXCommand(program)`
2. Register in `src/cli/program.ts`
3. Action = orchestration only; logic goes in `src/lib/`
