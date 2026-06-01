# Mockoto

**Build UI-first. Give your AI agent an API it can actually work with.**

Mockoto is a CLI that runs a local API simulation layer for developers and AI agents. Install it, start the server, and manage projects, rules, and responses from the built-in web UI—or point your app at the traffic proxy.

---

## Install

**Requirements:** Node.js 20+ and npm 9+.

```bash
npm install -g mockoto
```

Or run without installing:

```bash
npx mockoto
```

> **Windows note:** Mockoto uses SQLite via a native module. If install fails, add [Visual Studio Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/) with the “Desktop development with C++” workload, then retry.

---

## Start

```bash
mockoto
```

On first run, Mockoto:

1. Creates a local database in `./data/mockoto.db` (relative to your current directory)
2. Applies schema migrations automatically
3. Starts the management server and traffic proxy
4. Opens the web UI in your browser

| Service            | Default URL               | Purpose                                            |
| ------------------ | ------------------------- | -------------------------------------------------- |
| **Web UI**         | http://localhost:3000     | Create projects, collections, rules, and responses |
| **Management API** | http://localhost:3000/api | REST API (same host as the UI)                     |
| **Traffic proxy**  | http://localhost:3001     | Send application traffic here                      |

---

## How it works

```
Your app / AI agent
        │
        ▼
┌───────────────────┐     ┌────────────────────────────┐
│  Traffic proxy    │     │  Management server (:3000)  │
│  :3001            │     │  • Web UI                   │
│  /:projectId/*    │     │  • REST API /api/*          │
└─────────┬─────────┘     └────────────────────────────┘
          │
          ▼
   Rule match → configured response
   (or passthrough to upstream base_url)
```

1. **Create a project** in the UI — name, description, and upstream `base_url`.
2. **Add a collection** — activate the set of endpoints you want served.
3. **Define rules** — HTTP method, URL pattern, optional request body filter.
4. **Attach responses** — status, headers, body, latency; mark one as active.
5. **Point traffic at the proxy** — see below.

---

## Traffic proxy

Send requests through the proxy using your project ID:

```http
GET http://localhost:3001/<project-id>/users/42
```

Mockoto matches the path against rules in the project's **active collection** and returns the configured response. When passthrough is enabled on a rule, unmatched or configured traffic can be forwarded to the project's `base_url`.

**Example with curl:**

```bash
curl http://localhost:3001/your-project-id/api/health
```

---

## Configuration

Set environment variables before starting the CLI:

| Variable     | Default      | Description                                                       |
| ------------ | ------------ | ----------------------------------------------------------------- |
| `HOST`       | `localhost`  | Bind address for both servers                                     |
| `PORT`       | `3000`       | Management server (UI + API)                                      |
| `PROXY_PORT` | `3001`       | Traffic proxy                                                     |
| `NODE_ENV`   | `production` | Leave as default for full UI; use `development` for API-only mode |

```bash
PORT=8080 PROXY_PORT=8081 mockoto
```

**Data directory:** SQLite data is stored at `./data/mockoto.db` in the directory where you run `mockoto`. Run the CLI from your project root (or any folder) to keep data scoped to that workspace.

---

## Management API

For scripts and automation, the REST API is available at `http://localhost:3000/api`.

| Resource        | Path                                                       |
| --------------- | ---------------------------------------------------------- |
| Projects        | `/api/projects`                                            |
| Collections     | `/api/projects/:projectId/collections`                     |
| Rules           | `/api/projects/:projectId/collections/:collectionId/rules` |
| Responses       | `/api/projects/.../rules/:ruleId/responses`                |
| Agent (preview) | `POST /api/agent`                                          |

---

## Features

| Capability         | Description                                                                 |
| ------------------ | --------------------------------------------------------------------------- |
| **Projects**       | Group endpoints under a project with a unique base URL                      |
| **Collections**    | Version and switch response sets; one active collection per project         |
| **Rules**          | Match by method, URL pattern (`path-to-regexp` or regex), and optional body |
| **Responses**      | Multiple named responses per rule; status, headers, body, simulated latency |
| **HTTP proxy**     | Resolve rules at request time; return configured responses or passthrough   |
| **Agent endpoint** | Foundation for AI-driven scaffolding (integration in progress)              |

### Agent skills (Cursor / OpenCode)

Skills ship **inside the npm package** at `dist/apps/mockoto-be/skills/` (five packages: `mockoto`, `mockoto-api`, `mockoto-scaffold`, `mockoto-switching`, `mockoto-ui`).

```bash
# Path to bundled skills (after npm install -g mockoto)
mockoto skills path

# List packages and files
mockoto skills list

# Print copy commands into your project's .cursor/skills
mockoto skills copy
```

While Mockoto is running:

```http
GET http://localhost:3000/api/skills
GET http://localhost:3000/api/skills/mockoto-scaffold/scenarios.md
```

Monorepo contributors edit [`.cursor/skills/`](.cursor/skills/mockoto/SKILL.md); `npm run build:cli` copies them into dist. See [docs/mockoto-agent-skills-plan.md](docs/mockoto-agent-skills-plan.md).

---

## Roadmap

- AI agent integration to scaffold projects, collections, rules, and responses from natural language
- HAR import and traffic recording
- Enhanced collection modes and collaboration

---

## Contributing

Mockoto is developed in an Nx monorepo. To work on the source:

```bash
git clone <repository-url>
cd mockoto
npm install
npx nx serve mockoto-ui    # dev UI + API
```

See the repository for lint, test, and build targets (`npx nx run-many -t lint test build`).

---

## License

MIT (see `package.json`).
