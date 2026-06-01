# Mockoto UI navigation

Route definitions:

- `packages/mockoto-ui/features/projects/src/lib/projects.routes.ts`
- `packages/mockoto-ui/features/collections/src/lib/collections.routes.ts`
- `packages/mockoto-ui/features/rules/src/lib/rules.routes.ts`

## Hierarchy

```
/projects
  └── (list) projects-page
  └── /:projectId
        └── project-workspace
              └── /collections
                    └── project-layout (collection list)
                          ├── (panel) /:id → collection-panel
                          └── /:collectionId/rules
                                └── rules-page
                                      ├── (panel) /:id → rule-panel
                                      └── response-editor (per selected rule)
```

## Typical user flows

### New project → first mock

1. `/projects` → create project (panel outlet).
2. Open project → `/projects/:projectId/collections`.
3. Create collection with **active** toggle on (create mode defaults active in `CollectionPanelComponent`).
4. Open collection → rules route; add rule; add response with active set.

### Switch which API version the app sees

1. Stay on collections list for the project.
2. Click “Set as active” on another collection card (`setActiveClicked` → `updateMutation` with `isActive: true`).

### Switch success vs error response for one endpoint

1. Open `/projects/.../collections/.../rules`.
2. Select rule.
3. In response tabs, click “Set as active” on another response (`ResponseTabComponent`).

### Back navigation

`RulesPageComponent` exposes `backToProject()` and `backToCollection()` for breadcrumb-style escape hatches.

## Components (quick index)

| Component | Path under features |
|-----------|---------------------|
| `ProjectsPageComponent` | `projects/projects-page` |
| `ProjectWorkspaceComponent` | `projects/project-workspace` |
| `ProjectLayoutComponent` | `collections/project-layout` |
| `CollectionPanelComponent` | `collections/collection-panel` |
| `CollectionItemComponent` | `collections/collection-item` |
| `RulesPageComponent` | `rules/rules-page` |
| `ResponseEditorComponent` | `rules/response-editor` |
| `ResponseTabComponent` | `responses/response-tab` |
