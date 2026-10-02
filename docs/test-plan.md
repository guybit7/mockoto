# Mockoto UI — Test Plan

> **Goal:** Guarantee correctness of all UI behaviour, service logic, and component interactions across every release, running fully automated in CI.
>
> **Stack:** Angular 19 · TanStack Query · Vitest (unit) · Angular Testing Library (component) · Playwright (E2E)

---

## 1. Scope

| Layer | What we test | Tool |
|-------|-------------|------|
| Services | Query / mutation logic, cache invalidation, optimistic updates | Vitest + Angular TestBed |
| Components | Rendering states, user interactions, output events | Angular Testing Library + Vitest |
| Guards | `dirtyGuard` deactivation flow | Vitest + Angular TestBed |
| Interceptors | Toast on success/error/network-down | Vitest + HttpClientTestingModule |
| Design system | Component contract (inputs → rendered output) | Angular Testing Library |
| E2E | Full user flows across real screens | Playwright |

---

## 2. Unit & Component Tests

### 2.1 `ResourceService` (base class)

| # | Test | Assert |
|---|------|--------|
| U1 | `fetch` calls `GET` on the given path | `HttpTestingController` receives correct request |
| U2 | `create` calls `POST` with body | Correct method + body |
| U3 | `update` calls `PUT` with body | Correct method + body |
| U4 | `modify` calls `PATCH` with body | Correct method + body |
| U5 | `remove` calls `DELETE` | Correct method, no body |
| U6 | All methods return a resolved Promise from the first emission | Promise resolves with mock response |

---

### 2.2 `ProjectsService`

| # | Test | Assert |
|---|------|--------|
| P1 | `projectsQuery` fetches `GET /projects` | Query key `['projects']`, data sorted by `createdAt` desc |
| P2 | `projectQuery` skips when `id()` is null | `enabled: false`, no HTTP call |
| P3 | `createMutation` — success → optimistically prepends to cache | Cache contains new project at index 0 |
| P4 | `createMutation` — success → sets individual project cache entry | `['projects', id]` populated |
| P5 | `updateMutation` — success → invalidates projects list | `invalidateQueries` called with `['projects']` |
| P6 | `deleteMutation` — success → invalidates projects list | `invalidateQueries` called with `['projects']` |

---

### 2.3 `CollectionsService`

| # | Test | Assert |
|---|------|--------|
| C1 | `collectionsQuery` fetches `GET /collections/project/:id` | Correct URL, sorted by `createdAt` desc |
| C2 | Query disabled when `projectId()` is empty string | No HTTP call |
| C3 | `createMutation` — new collection `isActive: true` → all siblings marked `isActive: false` in cache | Cache updated optimistically |
| C4 | `createMutation` — new collection `isActive: false` → siblings untouched | Sibling `isActive` unchanged |
| C5 | `updateMutation` — `isActive: true` update → siblings set to `false` in cache | Optimistic cache correct |
| C6 | `updateMutation` — non-active update → siblings untouched | |
| C7 | `deleteMutation` — removes collection from list cache and removes individual query | Both caches cleaned |

---

### 2.4 `RulesService`

| # | Test | Assert |
|---|------|--------|
| R1 | `rulesQuery` fetches `GET /rules/collection/:id` | Correct URL and query key |
| R2 | Query disabled when `collectionId()` is null or `enabled()` is false | No HTTP call |
| R3 | `createMutation` success → invalidates rules queries | `invalidateQueries(['rules'])` called |
| R4 | `updateMutation` success → updates individual rule in cache and in collection list | Both cache entries updated |
| R5 | `deleteMutation` success → invalidates rules queries | `invalidateQueries(['rules'])` called |

---

### 2.5 `ResponsesService`

| # | Test | Assert |
|---|------|--------|
| RS1 | `responsesQuery` fetches `GET /rule-responses/rule/:id` | Correct URL |
| RS2 | `responseQuery` has `staleTime: 30_000` | staleTime set correctly |
| RS3 | `createMutation` — `isActive: true` → all existing responses set to `false` in cache | Optimistic deactivation |
| RS4 | `createMutation` — `isActive: false` → existing responses untouched | |
| RS5 | `updateMutation` success → updates individual response and updates in list cache | Both caches updated |
| RS6 | `deleteMutation` removes response from list cache and removes individual query | Both caches cleaned |
| RS7 | `setActiveMutation` → all sibling responses set to `isActive: false`, target set to `true` | Cache reflects single-active invariant |

---

### 2.6 `ToastInterceptor`

| # | Test | Assert |
|---|------|--------|
| T1 | POST success → `toastService.add` called with `level: 'success'` | |
| T2 | PUT success → success toast | |
| T3 | PATCH success → success toast | |
| T4 | DELETE success → success toast | |
| T5 | GET success → no toast | |
| T6 | Mutation error (4xx) → `level: 'danger'` with server message | |
| T7 | Network error (status 0) → server-down toast shown once | |
| T8 | Network error fired twice within 10s → only one toast (cooldown) | |
| T9 | `TOAST_OVERRIDE` suppress → no toast regardless of outcome | |
| T10 | `TOAST_OVERRIDE` custom `successMessage` → custom message shown | |

---

### 2.7 `DirtyGuard`

| # | Test | Assert |
|---|------|--------|
| D1 | Component returns `isDirty() = false` → guard returns `true` (navigation allowed) | No dialog shown |
| D2 | Component returns `isDirty() = true` → `ConfirmDialogService.confirm()` called | Dialog invoked |
| D3 | User confirms discard → guard returns `true` | Navigation proceeds |
| D4 | User keeps editing → guard returns `false` | Navigation blocked |

---

### 2.8 `RuleTestService`

| # | Test | Assert |
|---|------|--------|
| RT1 | GET rule → `window.open` called with `http://localhost:3001/:projectId/path` | Direct browser open |
| RT2 | POST rule → opens `/response-viewer?method=POST&url=...` | Viewer URL opened |
| RT3 | POST rule with `requestBody` → body base64-encoded in URL | `btoa` encoding correct |
| RT4 | HEAD / OPTIONS rules → open directly like GET | No viewer, direct open |

---

### 2.9 Component Tests

#### `ProjectsPageComponent`

| # | Test | Assert |
|---|------|--------|
| CP1 | Loading state → renders `mk-loading-skeleton` | Skeleton visible |
| CP2 | Error state → renders `mk-error-state` | Error message visible |
| CP3 | Empty state → renders `mk-empty-state` with "No projects yet" | Empty state visible, "New Project" button inside |
| CP4 | Data state → renders one `mk-project-card` per project | Count matches |
| CP5 | "New Project" button click → navigates to panel outlet `new` | Router navigate called |
| CP6 | Card `editClicked` → navigates to panel outlet with project id | |
| CP7 | Card `cardClicked` → navigates to `/projects/:id/collections` | |
| CP8 | `toggleFavoriteClicked` → calls `updateMutation.mutate` with toggled `isFavorite` | |
| CP9 | `deleteClicked` → shows browser confirm → calls `deleteMutation.mutate` | |

#### `CollectionItemComponent`

| # | Test | Assert |
|---|------|--------|
| CI1 | `isActive: true` → active border class applied, active dot shown | |
| CI2 | `isActive: false` → set-active button enabled, no active border | |
| CI3 | Set-active button click → `setActiveClicked` emitted, event stopped | |
| CI4 | Favorite star click → `toggleFavoriteClicked` emitted, event stopped | |
| CI5 | Edit button click → `editClicked` emitted, event stopped | |
| CI6 | Delete button click → `deleteClicked` emitted, event stopped | |
| CI7 | Mode badge label: `local` → "local", `proxy` → "proxy" | |
| CI8 | Mode badge click → `modeCycleClicked` emitted with correct next state | local→proxy, proxy→local |
| CI9 | Recording strategy cycle: `all → success → error → none → all` | 4 steps wrap correctly |
| CI10 | Collapsed mode → shows initials avatar, no buttons | |
| CI11 | `collapsed` + `isFavorite: true` → star icon visible | |
| CI12 | `collapsed` + `isActive: true` → green dot visible | |
| CI13 | Description tooltip shown on mouseenter, hidden on mouseleave | `descVisible` toggled |
| CI14 | `updating: true` → mode badge and set-active buttons disabled | |

#### `RulesPageComponent`

| # | Test | Assert |
|---|------|--------|
| RP1 | `workspaceStatus = 'loading'` → skeleton shown | |
| RP2 | `workspaceStatus = 'error'` → error state with "Try again" and "Back to Project" | |
| RP3 | `workspaceStatus = 'not-found'` → not-found state for collection | |
| RP4 | `workspaceStatus = 'rule-not-found'` → not-found state for rule | |
| RP5 | Rule selected → split layout shown (list + response editor) | |
| RP6 | No rule selected → rule list takes full width, no response editor | |
| RP7 | First rule auto-selected on load when no rule in query params | `selectRule` called with `rules[0].id` |
| RP8 | Escape key while fullscreen → exits fullscreen | `fullscreen` set to false |
| RP9 | Alt+2/3/4/5 → sets `splitLeft` to 15/25/50/75 | |
| RP10 | Arrow keys (non-input context) → `navigateCollection` called | |
| RP11 | `confirmDelete` → dialog shown → on confirm, rule deleted, query param cleared | |
| RP12 | `setActive` → `setActiveMutation.mutate` called, `editingResponseId` set on success | |
| RP13 | `openInBrowser` → `RuleTestService.openInBrowser` called | |

#### Design System Components

| Component | Tests |
|-----------|-------|
| `ButtonComponent` | Renders correct size/variant classes; disabled state; click emitted |
| `InputComponent` | Binds value; emits `ngModel` changes; shows error state |
| `ToggleComponent` | Checked/unchecked state; change emitted; disabled respected |
| `EmptyStateComponent` | Title and subtitle rendered; icon slot projected |
| `ErrorStateComponent` | Message rendered; content projected |
| `LoadingSkeletonComponent` | `count` renders correct number of rows; height class applied |
| `ConfirmDialogComponent` | Title/body/labels rendered; confirm/cancel buttons emit correct events |
| `SidePanelComponent` | Opens/closes; content projected |
| `CodeEditorComponent` | Renders Monaco editor; value binding works |
| `PaginationComponent` | Page change emitted; prev/next disabled at boundaries |
| `TableComponent` | Renders rows from data; sort event emitted from `ThComponent` |
| `TextFilterComponent` | Input emits debounced filter value |

---

## 3. E2E Tests (Playwright)

### Setup

```ts
// playwright.config.ts
baseURL: 'http://localhost:3000'
// Before each suite: seed Mockoto via REST API, teardown after
```

Each spec seeds its own data via `POST /api/projects` etc. and tears it down on `afterEach`. No shared state between suites.

---

### 3.1 Navigation & Shell

| # | Scenario | Steps | Assert |
|---|----------|-------|--------|
| E1 | Root redirect | Navigate to `/` | Redirected to `/home` |
| E2 | `/cli` redirect | Navigate to `/cli` | Redirected to `/home/cli` |
| E3 | Unknown route | Navigate to `/nonexistent` | Redirected to `/home` |
| E4 | Header present on all shell pages | Visit `/projects` and `/home` | Header visible on both |
| E5 | Breadcrumb updates on navigation | Navigate project → collection → rules | Breadcrumb shows correct trail at each level |
| E6 | Theme toggle | Click theme toggle | Dark/light class toggled on `<html>` |

---

### 3.2 Projects Page (`/projects`)

| # | Scenario | Steps | Assert |
|---|----------|-------|--------|
| E7 | Empty state | No projects seeded | "No projects yet" visible |
| E8 | Project list | 3 projects seeded | 3 cards rendered, sorted newest first |
| E9 | Create project | Click "New Project" → fill form → save | Project appears in list, toast "Created successfully" |
| E10 | Edit project | Click edit on card → change name → save | Updated name appears, success toast |
| E11 | Delete project | Click delete → confirm | Project removed from list, success toast |
| E12 | Cancel delete | Click delete → dismiss confirm | Project still in list |
| E13 | Toggle favorite | Click star on project card | `isFavorite` toggled, star state updated |
| E14 | Navigate to collections | Click project card body | URL changes to `/projects/:id/collections` |
| E15 | Dirty guard on project panel | Open edit panel → type → click away → confirm discard | Panel closes |
| E16 | Dirty guard — keep editing | Open edit panel → type → click away → cancel | Panel stays open |
| E17 | Error state | Server returns 500 on project list | Error state component visible |

---

### 3.3 Collections (`/projects/:id/collections`)

| # | Scenario | Steps | Assert |
|---|----------|-------|--------|
| E18 | Collection list | 2 collections seeded | Both visible in sidebar |
| E19 | Active collection indicator | `isActive: true` collection | Green dot and active border shown |
| E20 | Create collection | Click "+" → fill form → save | Collection appears, toast |
| E21 | Edit collection name | Edit → save | Updated name reflected |
| E22 | Delete collection | Delete → confirm | Collection removed from sidebar |
| E23 | Set active collection | Click active button on inactive collection | Collection becomes active, sibling deactivated, single active invariant maintained |
| E24 | Toggle favorite | Click star | Star state and `isFavorite` updated |
| E25 | Mode cycle badge | Click mode badge on `local` collection | Changes to `proxy` |
| E26 | Recording strategy cycle | Click recording badge | Cycles `all → 2xx → 4xx+ → pass` |
| E27 | Sidebar collapse / expand | Click collapse toggle | Collections show initials only |
| E28 | Dirty guard on collection panel | Open edit → type → navigate away → confirm | Panel closes |

---

### 3.4 Rules Page (`/projects/:id/collections/:id/rules`)

| # | Scenario | Steps | Assert |
|---|----------|-------|--------|
| E29 | Rule list | 5 rules seeded | All rules listed |
| E30 | Auto-select first rule | Navigate with no rule param | First rule selected, response editor shown |
| E31 | Select rule | Click second rule | Response editor updates to show that rule's responses |
| E32 | Create rule | Click "New Rule" → fill form → save | Rule appears in list, selected automatically |
| E33 | Edit rule | Open edit panel → change URL → save | Updated rule shown |
| E34 | Delete rule | Confirm dialog → delete | Rule removed, selection cleared |
| E35 | Toggle rule enabled | Click enable toggle | `isEnabled` toggled, visual indicator updated |
| E36 | Navigate between collections | Click prev/next arrow | URL changes to adjacent collection, rules updated |
| E37 | Keyboard arrow navigation | Press ↑ / ↓ (not in input) | Collection navigation triggered |
| E38 | Split pane drag | Drag split handle | Panel widths update |
| E39 | Alt+2/3/4/5 presets | Press Alt+2 with rule selected | Split set to 15/25/50/75% |
| E40 | Fullscreen mode | Click fullscreen button | Rules page fills viewport |
| E41 | Escape exits fullscreen | Press Escape | Normal layout restored |
| E42 | Collection not found | Navigate to deleted collection ID | Not-found state shown with "Back to Project" |
| E43 | Rule not found | Navigate to deleted rule in query param | Rule-not-found state shown |
| E44 | Collection activate from rules page | Click "Set Active" in rule list header | Collection marked active, proxy serves updated rules |

---

### 3.5 Responses

| # | Scenario | Steps | Assert |
|---|----------|-------|--------|
| E45 | Response list | 3 responses seeded for a rule | All visible in response editor |
| E46 | Active response indicator | One response `isActive: true` | Highlighted / marked active |
| E47 | Set active response | Click set-active on inactive response | Becomes active, sibling deactivated — single-active invariant |
| E48 | Create response | Click "New Response" → fill form → save | Response appears in list |
| E49 | Edit response body (code editor) | Edit JSON body → save | Updated body persisted |
| E50 | Delete response | Delete → confirm | Response removed from list |
| E51 | Response tab switching | Click between multiple responses | Editor shows selected response body |

---

### 3.6 Rule Test / Response Viewer

| # | Scenario | Steps | Assert |
|---|----------|-------|--------|
| E52 | Open GET rule in browser | Click "Open in browser" on GET rule | New tab opens at `localhost:3001/:projectId/path` |
| E53 | Open POST rule → response viewer | Click "Open in browser" on POST rule | New tab opens at `/response-viewer?method=POST&url=...` |
| E54 | Response viewer renders | Navigate to `/response-viewer?method=GET&url=...` | Viewer loads and shows response |

---

### 3.7 Toast Notifications

| # | Scenario | Steps | Assert |
|---|----------|-------|--------|
| E55 | Create success toast | Create any resource | "Created successfully" toast appears and auto-dismisses |
| E56 | Update success toast | Update any resource | "Updated successfully" toast |
| E57 | Delete success toast | Delete any resource | "Deleted successfully" toast |
| E58 | Server error toast | Server returns 500 | "Something went wrong" toast |
| E59 | Server down toast | Stop server, perform any action | "Mockoto server is not available" toast |
| E60 | Toast deduplication | Multiple concurrent requests fail (server down) | Only one server-down toast shown within 10s window |

---

### 3.8 Full User Journey (smoke test)

| # | Scenario |
|---|----------|
| E61 | **Greenfield flow:** Create project → create collection → create 3 rules → add 2 responses per rule → set one active → verify proxy returns correct response |
| E62 | **Scenario switch:** Create 2 collections with different responses → switch active → verify proxy switches |
| E63 | **Teardown:** Delete all responses → rules → collection → project → verify list empty |

---

## 4. CI Configuration

```yaml
# .github/workflows/ui-tests.yml
jobs:
  unit:
    steps:
      - run: pnpm nx run-many --target=test --projects=mockoto-ui,@mockoto-ui/*

  e2e:
    steps:
      - run: pnpm mockoto &          # start server
      - run: pnpm nx serve mockoto-ui &  # start UI
      - run: pnpm playwright test
```

### Gates

| Check | Threshold |
|-------|-----------|
| Unit test pass rate | 100% |
| Unit coverage (lines) | ≥ 80% |
| E2E pass rate | 100% |
| E2E retry on CI | max 1 retry (flake tolerance) |

---

## 5. Priority Order for Implementation

| Phase | Scope | Value |
|-------|-------|-------|
| 1 | All service unit tests (2.2–2.5) | Highest ROI — pure logic, fast, no DOM |
| 2 | `ToastInterceptor` + `DirtyGuard` tests | Critical infrastructure, easy to test |
| 3 | `CollectionItemComponent` + `RulesPageComponent` | Most complex components, most behaviour |
| 4 | E2E critical paths: E61–E63 + E7–E17 | Full user journey coverage |
| 5 | Remaining component and E2E tests | Complete coverage |

---

## 6. Key Invariants to Assert in Every Mutation Test

1. **Single active collection per project** — after any `isActive: true` update, exactly one collection has `isActive: true`
2. **Single active response per rule** — after any `setActive` or `create(isActive:true)`, exactly one response has `isActive: true`
3. **Cache consistency** — list cache and individual entity cache always agree after mutations
4. **Delete order** — responses deleted before rules, rules before collections, collections before projects
5. **Body always JSON object** — never a pre-stringified string in rule-response body
