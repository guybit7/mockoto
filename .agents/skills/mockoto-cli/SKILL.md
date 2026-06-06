---
name: mockoto-cli
description: >
  Operate the Mockoto CLI to check health, status, configuration, logs, and
  data safety (export/import/reset). Use when the user asks to start Mockoto,
  check if it is running, view logs, change ports, back up or restore data,
  or run diagnostics. Do not use for creating mocks or API calls — use
  mockoto-api for that.
---

# Mockoto CLI

The `mockoto` binary is the operational interface to Mockoto.
It does not require a build step — run it directly from the package root.

## Quick reference

| Goal | Command |
|------|---------|
| Start Mockoto | `mockoto` |
| Open browser | `mockoto open` |
| Check running status + stats | `mockoto status` |
| Run health checks | `mockoto doctor` |
| Validate data integrity | `mockoto validate` |
| Show configuration | `mockoto config show` |
| Change a setting | `mockoto config set <key> <value>` |
| Backup all data | `mockoto export` |
| Restore a backup | `mockoto import <file.zip>` |
| Wipe all data | `mockoto reset` |
| View logs | `mockoto logs` |
| Follow logs live | `mockoto logs --follow` |
| Show version | `mockoto --version` |
| Show help | `mockoto --help` |

---

## Commands in detail

### `mockoto` — Start

Starts the management server (port 3000) and proxy server (port 3001).
Opens the browser automatically in production mode.

```bash
mockoto
```

> If the server is already running, a second `mockoto` will fail to bind the port.
> Check with `mockoto status` first.

---

### `mockoto open` — Open browser

Opens `http://<host>:<port>` in the default browser.
Reads port and host from `~/.mockoto/config.json` (or defaults).

```bash
mockoto open
```

---

### `mockoto status` — Running status

Queries `GET /api/status` on the running server.
Exits **1** if the server is not reachable.

```bash
mockoto status
```

Example output:

```
Status
────────────────────────────────────────
✓  Running
   Port           3000
   Proxy port     3001
   Uptime         4m 12s
   Database       ok

Data
────────────────────────────────────────
   Projects       3
   Collections    9
   Rules          42
   Responses      87
```

Use this to confirm the server is up before running API calls.

---

### `mockoto doctor` — Health checks

Checks Node.js version, storage write access, database presence, config validity,
and server reachability. Safe to run at any time — makes no changes.

```bash
mockoto doctor
```

Exit codes: **0** = healthy, **1** = issues found.

Checks performed:

| Check | Pass condition |
|-------|----------------|
| Node.js version | ≥ 18 |
| Storage writable | Can write to `./data/` |
| Database | `./data/mockoto.db` exists |
| Configuration | `~/.mockoto/config.json` is valid JSON (or absent) |
| Server | `GET /api/status` responds (optional — warning only) |

---

### `mockoto validate` — Data integrity

Queries `GET /api/validate` on the running server.
Checks for orphaned records and rules without responses.

```bash
mockoto validate
```

Requires the server to be running. Exit **1** if issues found.

Issues detected:

| Issue | Meaning |
|-------|---------|
| Collections referencing a missing project | FK violation — should not occur |
| Rules referencing a missing collection | FK violation — should not occur |
| Responses referencing a missing rule | FK violation — should not occur |
| Rules with no responses | Mock is unreachable — proxy returns 404 |

> Rules with no responses are the most common real-world issue.
> Fix by adding at least one active response per rule via the API or UI.

---

### `mockoto config show` — View configuration

Displays effective configuration. Reads `~/.mockoto/config.json` if present,
otherwise shows defaults.

```bash
mockoto config show
```

Example output:

```
Configuration
────────────────────────────────────────
   Port           3000
   Proxy port     3001
   Host           localhost

   Config file: /Users/alice/.mockoto/config.json
```

---

### `mockoto config set` — Change a setting

Writes a value to `~/.mockoto/config.json`. Takes effect on next server start.

```bash
mockoto config set <key> <value>
```

Valid keys:

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `port` | number | `3000` | Management server port |
| `proxyPort` | number | `3001` | Proxy server port |
| `host` | string | `localhost` | Bind address |

Examples:

```bash
mockoto config set port 4000
mockoto config set proxyPort 4001
mockoto config set host 0.0.0.0      # bind to all interfaces
```

> Restart Mockoto after changing configuration.

Priority order: **env var** > **config file** > **default**

```bash
PORT=5000 mockoto    # overrides config file for this run only
```

---

### `mockoto export` — Backup

Creates a `.zip` containing the SQLite database and config snapshot.
Uses better-sqlite3's `.backup()` for a safe, hot copy.

```bash
mockoto export                        # writes mockoto-backup-<timestamp>.zip
mockoto export /path/to/my-backup.zip # custom path
```

The zip contains:

| File | Contents |
|------|----------|
| `mockoto.db` | Full SQLite database backup |
| `manifest.json` | Export metadata (version, date) |
| `config.json` | Config snapshot (if present) |

---

### `mockoto import` — Restore

Restores a backup created by `mockoto export`.
Automatically saves the current database before overwriting.

```bash
mockoto import mockoto-backup-2025-01-01T12-00-00.zip
```

Behaviour:

1. Validates the zip contains `manifest.json` and `mockoto.db`
2. Prompts for confirmation (type `import`)
3. Saves current database as `mockoto.db.pre-import-<timestamp>`
4. Extracts the backup database

> Restart Mockoto after importing.

---

### `mockoto reset` — Wipe data

Permanently deletes `./data/mockoto.db` (and WAL files).
Requires typing `reset` to confirm.

```bash
mockoto reset
```

> **Irreversible.** Run `mockoto export` first if you want a backup.

---

### `mockoto logs` — View logs

Logs are written to `~/.mockoto/mockoto.log` while the server runs.

```bash
mockoto logs              # last 50 lines
mockoto logs -n 100       # last 100 lines
mockoto logs --follow     # stream new lines as they arrive (Ctrl+C to stop)
mockoto logs -f           # shorthand for --follow
```

---

## Configuration file

Location: `~/.mockoto/config.json`

```json
{
  "port": 3000,
  "proxyPort": 3001,
  "host": "localhost"
}
```

Created automatically by `mockoto config set` or `mockoto config edit`.

---

## Common agent workflows

### Confirm server is healthy before API work

```bash
mockoto doctor
mockoto status
```

If `doctor` exits 1 → fix reported issues before proceeding.
If `status` exits 1 → start the server first: `mockoto`.

### Change ports when 3000 is already in use

```bash
mockoto config set port 4000
mockoto config set proxyPort 4001
mockoto
```

Then use `http://localhost:4000` for management and `http://localhost:4001` for proxy.

### Safe backup before destructive changes

```bash
mockoto export                        # creates mockoto-backup-<timestamp>.zip
# … make changes …
mockoto import mockoto-backup-*.zip   # restore if needed
```

### Debug why a mock isn't matching

```bash
mockoto validate                      # look for "rules with no responses"
mockoto logs -n 200                   # check recent proxy request logs
```

---

## Error reference

| Message | Cause | Fix |
|---------|-------|-----|
| `Mockoto is not running` | Server not started | Run `mockoto` |
| `Could not connect to Mockoto` | Wrong port or server down | Check `mockoto config show` |
| `No database found` | First run or reset | Run `mockoto` once to initialise |
| `Invalid backup file: missing manifest` | Not a Mockoto export | Use a zip from `mockoto export` |
| `Unknown config key` | Typo in key | Valid keys: `port`, `proxyPort`, `host` |
| `Invalid port` | Out of range (1–65535) or non-numeric | Use a valid port number |

---

## Related skills

| Goal | Skill |
|------|-------|
| Create projects, rules, responses | [mockoto-api](../mockoto-api/SKILL.md) |
| Full mock scaffolding scenarios | [mockoto-scaffold](../mockoto-scaffold/SKILL.md) |
| Switch active collection/response | [mockoto-switching](../mockoto-switching/SKILL.md) |
| Navigate the UI | [mockoto-ui](../mockoto-ui/SKILL.md) |
| Domain model, proxy, glossary | [mockoto](../mockoto/SKILL.md) |
