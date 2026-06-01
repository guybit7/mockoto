# npm install — notes for agents / contributors

**Context:** `package.json` uses **exact versions only** (no `^` or `~`). `npm install` may still fail or look “wrong” for two separate reasons.

---

## 1. The current failure is NOT caused by removing `^` / `~`

### What happens

```text
npm error code ENOTEMPTY
npm error path ...\node_modules\bonjour-service
npm error ENOTEMPTY: directory not empty, rmdir '...\bonjour-service'
```

### What it means

- npm is **reorganizing** `node_modules` during install (removing old packages, adding new ones).
- On **Windows**, `rmdir` often fails if:
  - Another process has files open (IDE, dev server, antivirus, file indexer)
  - A previous install was interrupted, leaving a half-updated tree
- This is a **filesystem / stale `node_modules`** problem, not a semver-range problem.

### Fix (do this first)

1. Stop all processes using the repo (`nx serve`, node, test watchers).
2. Close or exclude the folder from aggressive antivirus scanning if installs keep failing.
3. Delete `node_modules` completely (from repo root):

   ```powershell
   cd P:\mockoto-app\mockoto
   Remove-Item -Recurse -Force node_modules
   ```

   If delete fails with `EPERM` / `ENOTEMPTY` on Windows (common for `@tailwindcss/oxide` native files), **rename instead of delete**:

   ```powershell
   Rename-Item node_modules _node_modules_old
   npm install
   # delete _node_modules_old later when nothing locks those files
   ```

4. Regenerate install from a clean tree:

   ```powershell
   npm install
   ```

5. For CI / reproducible installs after lockfile is correct:

   ```powershell
   npm ci
   ```

**Status (fixed):** `package-lock.json` was regenerated to match exact pins in `package.json`. Repo root has `.npmrc` with `save-exact=true`.

`npm ci` removes `node_modules` and installs **exactly** what is in `package-lock.json`. It will fail if `package.json` and `package-lock.json` are out of sync.

---

## 2. Exact pins in `package.json` ≠ an updated `package-lock.json`

### What was done correctly

`package.json` lists **exact** versions, for example:

```json
"fastify": "5.8.5",
"rxjs": "7.8.2",
"@fastify/cors": "11.2.0"
```

No `^` or `~` on direct dependencies — good for “I want these exact top-level versions.”

### What is still wrong (stale lockfile)

The **root** entry inside `package-lock.json` (`packages[""]`) still reflects an **older** `package.json`, for example:

```json
"fastify": "^5.8.5",
"rxjs": "~7.8.0",
"@fastify/cors": "^11.2.0"
```

So:

| File | State |
|------|--------|
| `package.json` | Updated — exact versions |
| `package-lock.json` | **Out of date** — still documents old ranges for direct deps |

npm compares both files on `npm install`. A large drift triggers a big tree rewrite → more Windows `ENOTEMPTY` risk.

### What to do after pinning `package.json`

1. Delete `node_modules` (see above).
2. Regenerate the lockfile from the pinned manifest:

   ```powershell
   npm install
   ```

3. **Commit both** `package.json` and `package-lock.json`.
4. Tell teammates and CI to use **`npm ci`**, not `npm install`, when the lockfile exists.

Optional — keep future `npm add` exact by default (repo root `.npmrc`):

```ini
save-exact=true
```

---

## 3. Things that are normal (not bugs)

### Transitive dependencies still use ranges internally

Even with exact top-level pins, **dependencies of dependencies** declare `^` / `~` in *their* `package.json`. The lockfile stores the **resolved exact version** for each package in the tree. You cannot remove all `^` from the entire npm ecosystem — only from **your** direct entries in `package.json`.

### `overrides` in `package.json`

```json
"overrides": {
  "@spartan-ng/ui-core": {
    "tailwindcss": "$tailwindcss"
  }
}
```

This forces Spartan’s peer to use **your** `tailwindcss` version. It is intentional; not related to the install crash.

### Node version

Logs show **Node v24.4.0**. CI uses **Node 20**. For native modules (`better-sqlite3`), prefer **Node 20 LTS** locally to match CI and reduce compile surprises:

```powershell
nvm use 20
node -v   # should be 20.x
npm install
```

---

## 4. Quick decision tree for agents

```text
npm install fails?
│
├─ ENOTEMPTY / EBUSY / EPERM on node_modules\*
│   → Stale/blocked node_modules on Windows
│   → Delete node_modules, retry npm install
│
├─ ERESOLVE / peer dependency errors
│   → Version conflict (unrelated to ^ removal)
│   → Read npm error; fix with overrides or aligned versions
│
├─ better-sqlite3 / node-gyp build errors
│   → Install VS Build Tools (Windows) or use Node 20 LTS
│
└─ "package.json and package-lock.json are in sync" warnings / unexpected upgrades
    → Regenerate lockfile after pinning package.json
    → Commit package-lock.json; use npm ci in CI
```

---

## 5. Summary for the second agent

| Question | Answer |
|----------|--------|
| Did removing `^` / `~` break npm? | **No.** The crash is `ENOTEMPTY` while deleting old folders on Windows. |
| Is exact pinning correct in `package.json`? | **Yes.** |
| Is the repo fully locked? | **Not until** `package-lock.json` is regenerated and committed to match `package.json`. |
| What should the user run? | Delete `node_modules` → `npm install` (or `npm ci` once lockfile is synced) on **Node 20** if possible. |
| Should CI use `npm install` or `npm ci`? | **`npm ci`** after lockfile is updated. |

Do **not** “fix” the ENOTEMPTY error by re-adding `^` / `~` to `package.json`. Fix the install environment and sync the lockfile instead.
