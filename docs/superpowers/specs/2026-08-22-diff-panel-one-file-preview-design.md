# One-file diff preview

Stop sending a multi-file unified patch for working-tree and branch review. The preview RPC returns a file list plus stats. The pane shows one file. Opening a git-scope file fetches that file’s patch and full contents in parallel and paints once. Turn/checkpoint diffs still arrive as one patch; the client renders one file from it.

## Problem

`review.getDiffPreview` returns two full unified diffs (working tree and `base...HEAD`). Git stdout is cut at 120 KB and the UI shows “This diff was truncated because it exceeded the preview limit.” Files after the cut never appear in the tree, because the tree is built from the parsed patch.

The panel still stacks every file. Expand all on a large branch is the same problem in the client. Sending the full diff over the websocket is the wrong shape for remote, tunnel, and mobile.

## Goals

- Working-tree and branch preview payloads are a **file list + stats**, not a unified patch.
- Fetch a **per-file patch** and **per-file contents** only for the selected git-scope file.
- The large pane shows **one file** in every scope, including turns.
- Opening working tree or branch loads the first tree file (or a path supplied by chat).
- Full-file hydration stays for working tree and branch (unchanged lines filled in). Turns stay hunks-only.
- Mobile uses the same model: section → file list → one file.
- Remove Expand all / Collapse all.

## Non-goals

- Changing the turn/checkpoint diff RPC. It still returns one patch.
- Full-file hydration on turns.
- Per-commit patch scoping (commit list stays browse-only).
- Command palette or keybinding for next/previous file.
- Previous/next controls when the tree is hidden.
- Dual-serving the old `diff` string for older clients.
- Inventing a client-side diff from contents only (no patch RPC).
- Pull-request Code tab.

## Surfaces

- **Web** `DiffPanel` in `inline`, `sheet`, `sidebar`, `embedded`.
- **Desktop** wraps web. No extra IPC.
- **Mobile** review: same contract and one-file viewer.
- Chat’s changed-files card still opens a turn (and optional path). Settings are unchanged.

## Decisions

| Topic             | Choice                                                                                                   |
| ----------------- | -------------------------------------------------------------------------------------------------------- |
| Preview RPC scope | Working tree and branch only                                                                             |
| Pane              | One file, every scope                                                                                    |
| Default file      | First path in current tree sort, unless chat/store supplies a path                                       |
| Hide tree         | Toggle stays. Hidden tree means the current file only. No prev/next.                                     |
| Expand all        | Removed. Per-file header collapse chevron removed.                                                       |
| Git file open     | `getDiffFilePatch` + `getDiffFileContents` in parallel                                                   |
| Paint             | Keep the current file up. Loader on the selected tree/list row immediately. Swap once both RPCs succeed. |
| Turns             | Slice the existing checkpoint patch. No contents fetch.                                                  |
| Old `diff` field  | Removed from `ReviewDiffPreviewSource`. Breaking. Web, desktop, and mobile ship together.                |

## Wire

### `review.getDiffPreview`

Input is unchanged (`cwd`, optional `baseRef`, optional `ignoreWhitespace`).

`ReviewDiffPreviewSource` keeps `id`, `kind`, `title`, `baseRef`, `headRef`, `diffHash`, `truncated`, and the branch-range commit fields. **`diff` is removed.**

```ts
files: ReadonlyArray<{
  path: string;
  oldPath: string | null; // set on rename
  changeType: "change" | "rename-pure" | "rename-changed" | "new" | "deleted";
  additions: number | null;
  deletions: number | null;
  binary: boolean;
}>;
```

- `truncated` means the **file list** hit the listing cap, not a mid-patch cut.
- `diffHash` hashes the manifest (kind, refs, ignore-whitespace, sorted files). Clients drop cached per-file payloads when it changes.
- `additions` / `deletions` are `null` when unknown: binaries (`--numstat` `-`), or untracked rows we have not diffed.

Auth stays `review:write`, same as today.

### `review.getDiffFilePatch` (new)

Input matches `review.getDiffFileContents` plus `ignoreWhitespace`:

- `cwd`, `sourceKind`, `changeType`, `baseRef`, `headRef`, `oldPath`, `newPath`, `ignoreWhitespace`

Result:

```ts
{
  diff: string;
  truncated: boolean;
}
```

One-file unified diff. `truncated` is per file. Workspace-bound `cwd` check is the same as preview and contents.

Git-only, same as contents. Other VCS drivers return the existing unsupported-operation error. `VcsDriver.getDiffPreview` (optional) must return the new result type; there is no jj implementation today.

### `review.getDiffFileContents`

Unchanged. Still the 1 MB old/new read used to expand unchanged lines on working tree and branch.

## Server

`getReviewDiffPreview` stops running `git diff --patch` for the worktree and branch range, and stops `--no-index` on every untracked file.

Build each source’s `files` from:

| Input              | Command                                                                                                |
| ------------------ | ------------------------------------------------------------------------------------------------------ |
| Tracked (worktree) | `git diff HEAD --name-status` and `git diff HEAD --numstat` (plus `--ignore-all-space` when requested) |
| Tracked (branch)   | Same pair on `${baseRef}...HEAD`                                                                       |
| Untracked          | `git ls-files --others --exclude-standard -z`                                                          |

Untracked rows are `changeType: "new"`, `binary: false` unless we already know otherwise, stats `null`. Do not diff them to build the tree.

Listing stdout caps: **120_000 bytes** per command, same family as today’s preview caps. Drop incomplete trailing paths. If any listing is cut, `truncated: true` on that source.

`getReviewDiffFilePatch` runs a path-scoped `git diff --patch` (worktree vs `HEAD`, or `merge-base...HEAD` for branch, `--no-index` only for that untracked path). Honor `ignoreWhitespace`. Cap stdout at **1_048_576 bytes** (`REVIEW_DIFF_FILE_MAX_OUTPUT_BYTES`). Append the existing `[truncated]` marker and set `truncated: true` when cut.

Do not add a new `vcs.log` RPC. Commit list on the branch-range source stays as it is.

## Client fetch and paint

`packages/client-runtime` keeps the preview query. Add a single-flight command for `getDiffFilePatch`, keyed like contents (environment, cwd, source, refs, paths, ignore-whitespace).

**Git scopes, on select:**

1. Highlight the path. Show a loader on that tree/list row immediately.
2. Start patch and contents in parallel. Contents does not wait for the patch.
3. Leave the previous file in the pane (empty pane on first open).
4. When **both** succeed, parse the patch, attach contents via the existing Pierre `loadDiffFiles` / `expandUnchanged` path, replace the pane in one paint.
5. If the user selects another file first, ignore the stale pair.
6. If either RPC fails, do not paint hunks-only. Clear the row loader, keep the previous file (or empty on first open), show a short error in the pane for the selected file.

**Turns:** parse the checkpoint patch once, pick the selected file’s `FileDiffMetadata`, render hunks only. No contents RPC.

**Binary:** no patch or contents fetch. Pane: cannot preview binary.

Cache keys include `ignoreWhitespace` and `diffHash`.

## Panel UI

The pane is a single-file viewer. The tree is the switcher.

### Web / desktop

- Tree still starts visible (`DIFF_FILE_TREE_VISIBLE_BY_DEFAULT`). Hide toggle stays. Hide/show does not reset the selected path or column width.
- Remove Expand all / Collapse all. Remove the per-file header collapse chevron.
- Keep split/unified, wrap, ignore-whitespace, refresh, hunk nav, and review comments. They apply to the file in the pane.
- Header +/- is **scope totals** from the manifest (git) or the checkpoint patch file list (turns). Per-file +/- stays on the tree. Rows with `null` stats are omitted from the header total. Opening a file does not backfill list stats in this spec.
- Tree files for git scopes come from `source.files`, not from a parsed multi-file patch. Turn trees still come from the checkpoint patch.
- Sort is unchanged: `localeCompare` with `numeric: true`, `sensitivity: "base"`.
- **Default file:** first path in that sort. Chat `selectTurn(..., filePath)` / stored path wins if it exists in the list.
- **Scope change** (turn ↔ working tree ↔ branch): keep the current path if it exists in the new list, otherwise first file.
- If the file list is `truncated`, show a short footer on the tree. Do not revive the global “preview limit” banner.
- Per-file cap or parse failure: message in the pane, tree unchanged.
- Commit list in the tree column is unchanged.

Review comments still attach to the visible file. Composition and fences are unchanged beyond targeting that file.

### Mobile

- Section picker unchanged.
- File list is the switcher. Replace the “expanded file ids” set with a **single selected file**. Default is the first file, not every file expanded.
- Tap a row: loader on that row; keep the current file until the new one is ready.
- Git: patch + contents in parallel, full file. Turns: slice the checkpoint patch, hunks only.
- Same binary / error / stale-response rules as web.

## Errors and empty states

| Case                          | UI                                                    |
| ----------------------------- | ----------------------------------------------------- |
| No files                      | Existing “No net changes” (or mobile empty section)   |
| Preview RPC error             | Existing preview error in the pane                    |
| Turn checkpoint error         | Existing checkpoint error                             |
| Selected git file load failed | Previous file stays; pane error for the selected path |
| One of patch/contents failed  | Failed load, no hunks-only flash                      |
| Binary                        | Pane notice, no fetch                                 |
| File-list truncated           | Tree footer                                           |
| Per-file patch truncated      | Pane notice on that file only                         |

Workspace-root `cwd` checks stay on preview, patch, and contents.

## Docs

- `docs/user/`: the diff pane shows one file; the tree switches files; hide tree leaves you on the current file. No source paths, no RPC names.
- `docs/internals/`: preview is a manifest; `review.getDiffFilePatch` is the per-file patch; contents RPC is hydration only. Update glossary if “diff preview” still means a unified blob.

The 2026-08-14 file-tree spec’s “tree from the rendered patch” and “expand all still exists” rules are superseded by this document for the thread diff panel.

## Testing

Focused tests only. No `vp check`, no repo-wide typecheck or test run.

**Server**

- Preview returns `files` + stats and no `diff` blob.
- Untracked paths appear as `new` with `null` stats and do not trigger a per-file `--no-index` during preview.
- Listing cap sets `truncated: true` and does not include a partial trailing path.
- `getDiffFilePatch` is one path, honors refs and ignore-whitespace, sets per-file `truncated`.
- Existing contents tests stay.

**Contracts**

- `ReviewDiffPreviewSource` decodes `files` and has no `diff` field.
- New patch RPC payload and result decode.

**Web**

- Pane renders one file.
- Expand all control is gone.
- Hide-tree still works; selected path is unchanged.
- First file on open; chat `filePath` wins when present.
- Scope change keeps the path when it still exists.
- Row loader + previous file until both RPCs succeed; stale pair dropped.
- File-list footer vs per-file pane notice.

**Mobile**

- Default selection is one file (no all-expanded set).
- Same loader / keep-previous behavior.
- Git uses patch + contents; turns slice the checkpoint patch.

Existing `buildTurnDiffTree` / `ChangedFilesTree` tests stay the source of truth for nesting. File-tree tests that assume a stacked patch should be updated to a manifest (git) or a one-file pane.

## Files (expected)

- Modify: `packages/contracts/src/review.ts`, `packages/contracts/src/rpc.ts` (and IPC if it mirrors the review methods)
- Modify: `packages/client-runtime/src/state/review.ts`
- Modify: `apps/server/src/vcs/GitVcsDriverCore.ts`, `GitVcsDriver.ts`, `ReviewService.ts`, `ws.ts`, `RpcAuthorization.ts`
- Modify: `apps/web/src/components/DiffPanel.tsx`, collapse/focus helpers, diff rendering as needed
- Modify: `apps/mobile/src/features/review/*` (sections, model, sheet, visibility)
- Tests beside the files above
- Docs under `docs/user/` and `docs/internals/`
