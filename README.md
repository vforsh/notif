# notif

CLI for sending push notifications via [ntfy](https://ntfy.sh). No ntfy binary needed — uses the REST API directly.

## Install

```bash
bun install -g @vforsh/notif
```

## Setup

```bash
notif cfg init
# or manually:
notif cfg set server https://ntfy.example.com
notif cfg set topic my-topic
```

Verify setup:

```bash
notif doctor
```

## Usage

```bash
# Simple message
notif "Hello world"

# With title and priority
notif -t "Alert" -p high "Backups failed"

# Tags / emojis
notif -T warning,skull "Oh no"

# Clickable notification
notif --click "https://example.com" "Check this out"

# File attachment
notif --file report.pdf "Daily report"

# Markdown
notif --md "**Build** passed in \`main\`"

# Pipe from stdin
echo "Deploy complete" | notif -t "CI"

# Override topic
notif --topic other-channel "Message"
```

## Config

Stored at `~/.config/notif/config.json`. Keys: `server`, `topic`, `user`, `token`.

```bash
notif cfg ls          # show path + contents
notif cfg init        # interactive setup
notif cfg set <k> <v> # set value
notif cfg unset <k>   # remove value
```

Secrets (`user`, `token`) must be set via stdin:

```bash
echo "tk_abc123" | notif cfg set token
```

Precedence: CLI flags > env vars (`NOTIF_SERVER`, `NOTIF_TOPIC`, `NOTIF_USER`, `NOTIF_TOKEN`) > config file.

## Auth

```bash
# Access token
echo "tk_abc123" | notif cfg set token

# Username:password
echo "admin:secret" | notif cfg set user

# Or per-message
notif --token tk_abc123 "message"
```

## All flags

| Flag | Short | Description |
|------|-------|-------------|
| `--title` | `-t` | Message title |
| `--priority` | `-p` | Priority: 1=min, 2=low, 3=default, 4=high, 5=max |
| `--tags` | `-T` | Comma-separated tags/emojis |
| `--click` | | URL to open on notification click |
| `--icon` | | Notification icon URL |
| `--attach` | | External attachment URL |
| `--file` | | Local file to upload as attachment |
| `--filename` | | Override attachment filename |
| `--delay` | | Schedule message: `10s`, `30m`, ISO timestamp |
| `--email` | | Also send to email |
| `--actions` | | Actions JSON array or simple definition |
| `--md` | | Markdown formatting |
| `--no-cache` | | Don't cache server-side |
| `--no-firebase` | | Don't forward to Firebase |
| `--sid` | | Sequence ID for notification updates |
| `--topic` | | Override default topic |
| `--server` | | Override default server |
| `--user` | | `username:password` auth |
| `--token` | | Access token auth |
| `--json` | | Output raw JSON response |
| `--plain` | | Output only message ID |
| `-q` | | Suppress all output |

## License

MIT
