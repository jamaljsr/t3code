# Multi-project sidebar scope

Let a user filter the sidebar to any non-empty set of logical projects. The selection is temporary, begins at “All projects” on each sidebar mount, and deliberately does not introduce saved groups or persistence.

The implementation must remain isolated from server contracts, shared settings, mobile, and other compatibility-sensitive surfaces so the long-lived personal branch remains easy to fold over upstream releases.

## Non-goals

- Named or saved project groups
- Persistence across reloads, remounts, or app restarts
- Cross-device synchronization
- Mobile support
- Server, database, contract, provider, command-palette, settings, or keybinding changes
- Changes to how logical projects group physical checkouts across environments

## Architecture

Add a web-only `ProjectScopeSelector` module under `apps/web/src/components/sidebar/`. It owns the ephemeral logical-project selection, derives the physical project references used by the existing sidebar filter, and renders the selector menu.

Keep the integration in `Sidebar.tsx` to two narrow regions:

1. Replace the current single `projectScopeKey` state and derived `scopedProjectGroup` with the new selector state and its derived scope.
2. Replace the current radio-menu markup with the extracted selector component.

The existing sidebar remains responsible for filtering drafts and thread shelves from a `ReadonlySet` of scoped physical project keys, clearing hidden bulk selections, resetting settled-thread pagination, and rendering empty states. The selector does not duplicate those paths.

Selection transition logic should remain pure and independently testable. It may live beside the component in a small logic module if separating it materially simplifies focused tests; otherwise it should stay in the selector module to avoid unnecessary files.

## Selection model

Use the existing logical `projectKey` from `SidebarProjectSnapshot` as the selection identity.

- `all` means unrestricted scope. It is the initial state and is not persisted.
- `custom(projectKeys)` contains one or more logical project keys.
- Zero selected projects is invalid.

The unrestricted scope expands dynamically to all current logical projects, so projects added while the selector is open or mounted appear automatically. A custom selection does not automatically include newly added projects.

When the available logical projects change:

1. Remove selected keys that no longer exist.
2. If a custom selection becomes empty, return to `all`.
3. If a custom selection now contains every available project, normalize it to `all`.

Normalization keeps labels and newly added-project behavior unsurprising without writing any migration or persistence code.

## Menu behavior

The trigger displays:

- Folder icon and “All projects” for unrestricted scope
- The selected project’s favicon and display name for one selected project
- Folder icon and “N projects” for multiple selected projects

The popup contains:

1. An “All projects” command row with a folder icon and no checkbox. Clicking it restores unrestricted scope and closes the menu immediately.
2. One project row per logical project. Each row always shows a check control. Selected checks use the normal foreground color. Unselected checks stay visible but muted. While unrestricted, every check appears selected.

Clicking the project row (favicon, name, or remaining row area) replaces the current scope with that single logical project and closes the menu immediately. This is the common single-project switch.

Clicking the check toggles that project immediately and keeps the menu open. This is how a user builds a multi-project scope. The final selected project cannot be unchecked. When unrestricted, unchecking one project creates a custom selection containing every other available project.

Each project row retains the existing project-settings gear. There is no separate “Show only this project” control; the row click owns that action.

The check and settings buttons stop row selection events so they do not also focus a single project or close the menu.

The settings button retains its existing navigation, event handling, and menu-closing behavior.

## Data flow

The selector receives the already sorted `SidebarProjectSnapshot[]` and exposes the effective logical selection plus a derived physical-key set.

For custom scope, union every selected logical group’s `memberProjectRefs` into physical keys formatted exactly as the existing sidebar expects: `<environmentId>:<projectId>`. For unrestricted scope, expose `null` so all current sidebar filtering paths retain their current “no filter” behavior.

The sidebar uses the effective scope to:

- Filter draft rows
- Partition active, pinned, snoozed, and settled threads
- Limit sidebar search to currently scoped threads
- Clear bulk thread selection whenever scope changes
- Reset settled-thread pagination whenever scope changes
- Render “No threads in <project> yet” for a single-project scope
- Render “No threads in selected projects yet” for a multi-project scope
- Retain “No threads yet” for unrestricted scope

An active route whose thread falls outside the new scope follows current single-project filtering behavior; this feature does not introduce a special visible-row exception.

## Error and edge-case handling

There is no I/O or persistence, so storage decoding, quota failures, migrations, and synchronization errors do not apply.

- With zero projects, keep the selector hidden as it is today.
- With one project, the project remains checked and cannot be unchecked; “All projects” and row-click still close the menu predictably.
- Removed or regrouped projects are reconciled as described in the selection model.
- Duplicate project keys are treated as one selection.
- Project settings and check-toggle buttons must prevent pointer/click propagation into the row.

## Testing

Add focused unit tests for pure selection and presentation behavior:

- Initial unrestricted state
- Unchecking one project from unrestricted scope
- Checking and unchecking projects in custom scope
- Prevention of an empty selection
- Row click focusing one project and closing the menu
- Check-click toggling selection while keeping the menu open
- Muted checks on unselected projects
- Restoring unrestricted scope
- Reconciliation after project removal or regrouping
- Normalization when custom scope becomes equivalent to all
- Logical-group expansion to all member physical project references
- Trigger presentation for unrestricted, single-project, and multi-project scopes

Prefer testing the new module without mounting the full sidebar. During implementation, run only its focused test file plus targeted web lint and typechecking. Do not run repository-wide checks.

Integrated browser verification is optional and requires explicit user approval before launching a browser or using computer control.

## Surface audit

- Web: included
- Desktop: included through the wrapped web client
- Mobile: intentionally unchanged because the daily personal client is the separately shipped App Store binary
- Server and contracts: unchanged
- Providers: unchanged
- Local, remote/relay, and tunnel connection modes: use the existing logical-to-physical project grouping; no new transport behavior
- Settings, command palette, and keybindings: not applicable to this sidebar-only filter
- Reverse state: “All projects” restores unrestricted scope
- Documentation: this design records the personal-overlay behavior; no shipped user documentation is required for the private overlay

## Merge-conflict strategy

Keep fork-owned logic in new files under `apps/web/src/components/sidebar/`. Limit edits in the upstream-heavy `Sidebar.tsx` to imports, state/derived-scope wiring, the existing reset dependency, empty-state wording, and replacement of the existing selector markup. Do not modify shared menu primitives or project-grouping behavior.

This structure gives future upstream folds small, obvious integration points and avoids protocol or settings-schema conflicts.
