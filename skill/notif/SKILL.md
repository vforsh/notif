---
name: notif
description: Send push notifications via ntfy using the `notif` CLI. Use when the agent needs to send notifications, alerts, or messages to a phone/desktop — task completion alerts, clickable links, file attachments, build status, deploy results, or any event worth notifying about. Triggers on mentions of notify, notification, push, alert, ntfy, notif, "send me", "let me know", "ping me".
---

# notif

CLI for sending push notifications via ntfy. Server and topic are pre-configured — run `notif doctor` to verify setup.

## Usage

```bash
notif "Hello world"
notif -t "Alert" -p high "Backups failed"
notif -T warning,skull "Oh no"
notif --click "http://192.168.1.12:8080" "Server ready"
notif --file report.pdf "Daily report"
notif --md "**Build** passed in \`main\`"
notif --attach "https://example.com/image.png" "See this"
echo "Done" | notif -t "CI"
notif --topic other-channel "Override topic"
```

## Flags

| Flag | Short | Description |
|------|-------|-------------|
| `--title` | `-t` | Message title |
| `--priority` | `-p` | `1`=min, `2`=low, `3`=default, `4`=high, `5`=max |
| `--tags` | `-T` | Comma-separated tags/emojis |
| `--click` | | URL to open on tap |
| `--file` | | Upload local file to storage provider, attach public URL |
| `--attach` | | Remote URL attachment |
| `--md` | | Markdown formatting |
| `--delay` | | Schedule: `10s`, `30m`, ISO timestamp |
| `--topic` | | Override default topic |
| `--server` | | Override default server |
| `--json` | | JSON response to stdout |
| `--plain` | | Message ID only to stdout |
| `-q` | | Suppress output |

## Localhost rule

**NEVER send `localhost` or `127.0.0.1` URLs in notifications.** Notifications arrive on mobile devices on the same Wi-Fi network — localhost is unreachable there.

Use `lan_ip` from config (check with `notif cfg ls`) instead:

```bash
notif --click "http://192.168.1.12:3000" "Dev server ready"
```

Fallback if `lan_ip` is not configured: `ipconfig getifaddr en0`.

This applies to `--click` URLs, URLs in message body, and any other link.

## Config

- `notif cfg ls` — show config path and contents
- `notif cfg init` — interactive setup (TTY)
- `notif cfg set <key> <value>` — set value (`server`, `topic`; secrets via stdin)
- `notif cfg unset <key>` — remove value
- `notif doctor` — verify setup (config, server reachability, storage provider)

### Config keys

| Key | Description |
|-----|-------------|
| `server` | ntfy server URL |
| `topic` | Default topic |
| `user` | Auth user:pass (secret, set via stdin) |
| `token` | Auth token (secret, set via stdin) |
| `upload_provider` | Storage provider for `--file` uploads (e.g. `yadisk`) |
| `upload_path` | Remote directory for uploads (default: `/notif-uploads`) |
| `lan_ip` | Machine's LAN IP — use instead of `localhost` in notification URLs |

## Errors

| Message | Cause |
|---------|-------|
| `No storage provider configured` | Run `notif cfg set upload_provider yadisk` |
| `No server configured` | Run `notif cfg set server <url>` |
| `No topic configured` | Run `notif cfg set topic <name>` |
| `ntfy error 401` | Auth failed |
| `ntfy error 429` | Rate limited |
