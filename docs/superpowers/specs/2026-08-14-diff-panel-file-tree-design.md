# Diff panel file tree

A toggleable, resizable file tree in the web thread diff panel that lists the files in the currently displayed diff and jumps to the first hunk of a chosen file.

## Problem

The web diff panel stacks every file in the current scope (turn, working tree, or branch). Jumping to a file is only possible when chat’s changed-files card opens the panel with a path. There is no navigator inside the panel itself.

Chat already has a nested changed-files tree (`ChangedFilesTree` + `buildTurnDiffTree`). Mobile review already has a flat changed-files pane. This spec is the web panel navigator only.

## Goals

- Show a nested file tree of the files in the **currently rendered** patch.
- Let the user jump to a file without scrolling the stacked diffs by hand.
- On working tree and branch diffs, show that file as a full-file diff (unchanged lines filled in) with every other file collapsed, then land on the **first hunk**, not line 1.
- On turn diffs, the same collapse-and-jump behavior, but hunks only (no full-file hydration).

## Non-goals

- Pull-request Code tab.
- Mobile review (already has a changed-files pane).
- Scroll-spy (highlight the file currently in the viewport while scrolling).
- Search/filter inside the tree.
- Command palette entry or keybinding.
- Keyboard resize of the column.
- Full-file hydration for turn/checkpoint diffs.

## Surfaces

Web `DiffPanel` in every mode it already has: `inline`, `sheet`, `sidebar`, `embedded`. Desktop inherits this because it wraps web.

The toggle is only on the diff panel header. Chat’s changed-files card, Settings, and the command palette are unchanged.

## Architecture

Keep `buildTurnDiffTree` as the tree model.

Extract a presentational tree from `ChangedFilesTree`:

- New: `apps/web/src/components/diffs/DiffFileTree.tsx`
- Chat’s `ChangedFilesCard` / `ChangedFilesTree` become wrappers that still call `onOpenTurnDiff`. They do not collapse sibling files in the panel.
- The panel tree adds a `selectedPath` highlight and calls `onSelectFile(path)`.

`DiffPanel` owns:

- Tree visibility (React state, **not** persisted; each panel mount starts hidden).
- Column width via existing `useResizableWidth` (persisted in `localStorage`).
- Focus behavior (collapse others, optional `expandUnchanged`, scroll to first hunk).

Do not use Pierre’s project `FileTree`.

Focus helpers live in `apps/web/src/lib/diffFileFocus.ts` so they can be unit-tested without mounting `DiffPanel`.

## Layout

Hidden until a header toggle on the same row as stacked/split (`PanelLeftIcon`, `aria-pressed` reflecting visibility, tooltip “Show file tree” / “Hide file tree”).

When on: a left column and the stacked diffs on the right, in every panel mode. When off: diffs are full width. Hide/show does not reset width or the last selected path.

### Resize

Reuse `useResizableWidth` with `edge: "right"` and a drag handle on the right edge of the tree column (same visual language as `RightPanelResizeHandle`).

| Token         | Value                                                         |
| ------------- | ------------------------------------------------------------- |
| Default width | 200px                                                         |
| Min width     | 140px                                                         |
| Max width     | `min(50% of the panel, panel width − 240px)`, never below min |
| Storage key   | `t3code:diff-panel-file-tree-width`                           |

If the panel is too narrow for min tree + 240px diffs, keep the tree at min and let the diffs take the remainder (the inline panel is already allowed to be ~360px).

## Tree contents

Build the tree from the **renderable files** in the current patch (`codeViewFiles` / Pierre `FileDiffMetadata`), not from git status or turn summaries that might include files the preview truncated.

Map each file to `{ path, kind, additions, deletions }` using `resolveFileDiffPath` and per-file line stats, then `buildTurnDiffTree`.

- Nested folders, compacted single-child paths (`src/components`), +/- stats on files and directories.
- Folders start expanded. Collapsing a folder is local to the tree and does not change the patch.
- Rename: show the new path, matching stacked headers.
- Empty / loading / not a git repo: no toggle, no column.

## Click and focus

Clicking a file in the tree, in order:

1. Set the collapsed-file set to every file **except** the clicked one (expand the clicked file). One file in the patch: no-op on collapse, still jump.
2. Set `selectedPath` to that path (tree highlight).
3. Working tree / branch (git `loadDiffFiles` exists): set CodeView `expandUnchanged` to `true` so Pierre hydrates that file. Turn diffs: leave `expandUnchanged` false.
4. After layout (and hydration if it ran), `scrollTo` the first hunk’s first changed line — `type: "line"`, `additionStart` / `additions` if the hunk adds, else `deletionStart` / `deletions`. Not the file header, not line 1 of a hydrated file.
5. Clicking the same file again repeats the scroll. It does not expand the other files.

No hunks (binary, empty, unparsed): `scrollTo` the file item header.

**`expandUnchanged` constraint.** It is a CodeView-wide option. Only enable it when a git-scope file is focused **and** every other file is collapsed, so a large branch diff is not hydrated in full. If Pierre still hydrates collapsed files, do not set the flag globally; call `loadDiffFiles` for the focused file only and keep that `FileDiffMetadata` object identity as Pierre requires.

**Hydration failure.** Keep the hunks, still jump to the first hunk, no toast.

**Scope change** (turn ↔ working tree ↔ branch): rebuild the tree, clear `selectedPath`, turn `expandUnchanged` off.

**Existing collapse-all / expand-all** still toggles stacked file headers, not folder expansion in the tree.

**Chat** still opens the panel on a turn (and optional path). That existing scroll-to-file path does not collapse siblings. Only the panel tree does.

## Testing

No full `DiffPanel` mount. Unit-test helpers and the extracted tree:

- `collapseAllExcept(fileKeys, targetKey)` — many files, one file, unknown path (collapse all).
- `firstHunkScrollTarget(fileDiff, fileKey)` — additions, deletions-only, no hunks → item scroll.
- `canExpandUnchanged({ hasGitLoader, selectedTurnId })` — true only for git scopes.
- `DiffFileTree` highlights `selectedPath`; chat `ChangedFilesCard` still renders.
- Existing `buildTurnDiffTree` / `ChangedFilesTree` tests remain the source of truth for nesting and stats.

## Files (expected)

- Create: `apps/web/src/components/diffs/DiffFileTree.tsx` (+ test)
- Create: `apps/web/src/lib/diffFileFocus.ts` (+ test)
- Modify: `apps/web/src/components/chat/ChangedFilesTree.tsx` (use the extracted tree)
- Modify: `apps/web/src/components/DiffPanel.tsx` (toggle, column, resize, focus)
- Reuse the existing resize-handle markup (right edge of the tree column). Do not change `RightPanelResizeHandle` unless extracting a shared `edge` prop is less code than a local copy.
