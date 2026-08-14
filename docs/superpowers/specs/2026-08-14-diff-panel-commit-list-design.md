# Diff panel commit list

A browse-only commit list in the web thread diff panel’s file-tree column: files on top, commits pinned at the bottom, expandable full messages. No per-commit patch scoping in this spec.

## Problem

The thread diff panel can show the working tree or the branch range (`baseRef..HEAD`), but not the commits that make up that range. The only commit-shaped UI nearby is the pull-request Code tab’s **dropdown**, which scopes a hosted PR diff. Users want a visible list next to the file tree and hunks, and to expand a row for the full message.

There is no local `git log` on `diffPreview` today, and nothing in the thread panel to reuse as a list.

## Goals

- On Working tree and Branch changes, show the commits in `baseRef..HEAD` in the same left column as the file tree.
- Pin that list to the **bottom** of the column so the file tree keeps the space.
- Let the user expand a commit to read the full message.
- When the working tree is dirty, show a synthetic **Uncommitted** row. Clicking it switches to Working tree (existing `selectGitScope("unstaged")`).
- Hide the list on turn/checkpoint diffs.

## Non-goals

- Per-commit filter of the file tree or hunks (`git show` / `git diff parent..commit`). Follow-up spec.
- Inner resize between the tree and the commit pane.
- Persist which rows are expanded.
- `+/-` stats on commit rows.
- “Load more” beyond the first 100 commits.
- Pull-request Code tab (already has its own commit picker).
- Mobile review.
- Command palette entry or keybinding.
- Reusing `GitCommitSheet` (that flow creates a commit).

## Surfaces

Web `DiffPanel` in every mode it already has: `inline`, `sheet`, `sidebar`, `embedded`. Desktop inherits this because it wraps web.

The existing file-tree header toggle is the only control. Chat’s changed-files card, Settings, and the command palette are unchanged.

## Architecture

Keep `diffPreview` as the single request. Do not add a `vcs.log` RPC.

Extend `ReviewDiffPreviewSource` so the **branch-range** source can carry:

```ts
commits: ReadonlyArray<{
  oid: string;
  subject: string;
  body: string;
  authorName: string;
  committedAt: string; // IsoDateTime from git `%aI`
}>;
commitsTruncated: boolean;
commitsError: boolean;
```

All three fields are optional on the schema so the working-tree source and older servers stay valid. Only `getReviewDiffPreview` populates them, and only on `kind: "branch-range"`. Use the existing `IsoDateTime` schema for `committedAt`.

`DiffPanel` owns visibility:

- Column still follows the file-tree toggle and `treeFiles.length > 0`.
- Commit pane only when `selectedTurnId === null` (Working tree or Branch changes) **and** there is something to show (at least one commit, Uncommitted, or `commitsError`).

`DiffFileTreeColumn` renders the bottom pane. New presentational `DiffCommitList` does not know about DiffPanel or Pierre.

Do not reuse the PR Code tab dropdown, `PullRequestCommit` (host-shaped), or `GitCommitSheet`.

## Layout

Same left column as the file tree (`DiffFileTreeColumn`).

| Region        | Behavior                                                           |
| ------------- | ------------------------------------------------------------------ |
| Files         | Existing tree, `flex-1`, own scroll                                |
| Commits       | Bottom-anchored, own scroll, `max-height: 40%` of the column       |
| Column toggle | Unchanged `PanelLeftIcon`. Column off hides files **and** commits  |
| Column width  | Existing `useResizableWidth` / `t3code:diff-panel-file-tree-width` |
| Inner split   | No drag handle in this spec                                        |

On a turn, the column is tree-only (no commit pane). Expanding a long message grows inside the commit pane; it does not steal the tree’s `flex-1` space.

Empty / loading / not a git repo: no toggle, no column (same as the file tree). If the current patch has no renderable files, the column stays hidden even if commits exist.

## Data

In `getReviewDiffPreview`, after the resolved `baseRef` is known, run `git log` in parallel with the existing patches:

```text
git log -n 101 --format=%H%x00%s%x00%b%x00%an%x00%aI%x1e <baseRef>..HEAD
```

- Newest first (git default).
- Return at most **100** commits. If 101 were produced, set `commitsTruncated: true` and drop the oldest of that page.
- No `baseRef`: `commits: []`, `commitsTruncated: false` (same as an empty range).
- Cap stdout with a dedicated `maxOutputBytes` in the same family as `REVIEW_DIFF_PATCH_MAX_OUTPUT_BYTES` (do not reuse `readRangeContext`’s `--oneline` blob).
- Log failure: still return the working-tree and branch-range diffs. Set `commits: []`, `commitsTruncated: false`, `commitsError: true`. Do not fail the whole preview. The client needs `commitsError` so an empty range (hide the pane) is distinct from a failed log (show “Couldn’t load commits”).

**Uncommitted** is client-only. Show it when the working-tree source’s `diff` is non-empty. It is not a git commit and does not go on the wire.

The list is available on both Working tree and Branch changes because both scopes already share one `diffPreview`. The file tree still reflects the **currently rendered** patch; the commit list always reflects the branch-range log plus Uncommitted.

## Click and expand

**Git commit row**

- Line 1: subject (truncate) and short oid (`oid.slice(0, 7)`).
- Line 2: `authorName` · `formatShortTimestamp(committedAt)`.
- Click anywhere on the row toggles expand. Expanded content is `body` (trimmed). Empty body: no extra chrome, row stays one block.
- Expand state is local React state, keyed by `oid`. It resets when the commit list identity changes (new `diffHash` / base ref / preview). Not persisted.
- Click does **not** change the patch, the file tree, or `expandUnchanged`. No git row is highlighted as “the current patch.”

**Uncommitted row**

- Distinct top row, label “Uncommitted”, no oid.
- Highlighted while `selectedGitScope === "unstaged"`.
- Click calls `selectGitScope("unstaged")`. Already on Working tree: no-op besides the existing highlight.

**Truncation**

- If `commitsTruncated`, a muted “Showing latest 100 commits” line at the bottom of the list. No pagination.

**Unchanged**

- Tree folder expand, collapse-all / expand-all on stacked files, file-tree click-to-focus, and the scope dropdown stay as they are.

## Empty and error

| Situation                              | UI                                                   |
| -------------------------------------- | ---------------------------------------------------- |
| Clean working tree                     | No Uncommitted row                                   |
| No commits in range and no Uncommitted | Hide the commit pane; tree fills the column          |
| Log failed, diffs still arrived        | Show the pane with one line: “Couldn’t load commits” |
| Truncated branch patch                 | Existing banner unchanged; the list is independent   |
| Empty range, dirty working tree        | Uncommitted only                                     |

## Testing

No full `DiffPanel` mount.

Server (`GitVcsDriverCore` review preview tests):

- Newest-first commits on the branch-range source; working-tree source has no `commits`.
- 101+ commits → 100 returned and `commitsTruncated: true`.
- Missing `baseRef` → empty list, preview still has diffs.
- `git log` failure → diffs still returned, `commits: []`, `commitsError: true`.

Client (`DiffCommitList`):

- Expand / collapse a row with a body; empty body does not add a body block.
- Uncommitted highlight when `workingTreeSelected`.
- Click Uncommitted calls `onSelectUncommitted`.
- Renders nothing when `commits` is empty, Uncommitted is off, and there is no load error.
- Shows the load-error line and the truncated footer when those flags are set.

Existing file-tree, `diffPreview`, and `ChangedFilesTree` tests remain the source of truth for trees and patches.

## Files (expected)

- Create: `apps/web/src/components/diffs/DiffCommitList.tsx` (+ test)
- Modify: `packages/contracts/src/review.ts` (`ReviewDiffPreviewSource` commit fields)
- Modify: `apps/server/src/vcs/GitVcsDriverCore.ts` (`git log` beside the existing preview diffs)
- Modify: `apps/server/src/vcs/GitVcsDriverCore.test.ts`
- Modify: `apps/web/src/components/diffs/DiffFileTreeColumn.tsx` (bottom pane)
- Modify: `apps/web/src/components/DiffPanel.tsx` (pass commits / Uncommitted / git-scope-only visibility)
