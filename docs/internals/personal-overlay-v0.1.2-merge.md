# Personal overlay merge: v0.1.2

Upstream source: `v0.1.2` (`044f07257c`). Personal source: `f479372414`.
Merge base: `81493efb71` (`v0.1.0`).

v0.1.2 still speaks orchestration protocol 2. The App Store app was 2.1.0 at the time of this
fold.

## Decisions

- **Review workspace check follows upstream.** Upstream's `KnownWorkspaces` allows the server
  cwd, managed worktree folders, registered projects, and a thread's worktree when it is under a
  managed folder or git lists it as a worktree of the thread's project. That covers worktrees
  another tool created, which the personal "any active thread's worktree" rule existed for, so
  the personal rule was dropped.
- **Personal sidebar scope kept.** Upstream's persisted single-project scope picker was not
  taken. The personal multi-project selector and header sit on upstream's restructured
  `Sidebar.tsx`. Upstream's newer behaviors that read the scope (route reveal widening the scope,
  the settled tail resetting per scope, the selection clearing on a scope change) read the
  personal scope instead.
- **Personal review reader and defaults kept.** Upstream moved the generic diff openings into
  `useRightPanelActions.ts` and `useProactivePanels.ts`. Both were returned to the working tree.

## Conflict resolutions

| File                                                                     | Resolution                                                                                                                                                                         |
| ------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `apps/server/src/vcs/GitVcsDriverCore.ts`                                | Personal reader on top of upstream's other Git changes, plus upstream's option-like ref name guard.                                                                                |
| `apps/server/src/review/ReviewService.ts`, `apps/server/src/server.ts`   | Upstream's versions, which use `KnownWorkspaces`.                                                                                                                                  |
| `apps/server/src/project/AgentSessionScanner.ts`                         | Kept the symlink-resolved base and worktree folder exclusions.                                                                                                                     |
| `packages/contracts/src/review.ts`                                       | Personal `manifest` shape; upstream only dropped a comment.                                                                                                                        |
| `packages/source-control-github/src/server/GitHubPullRequestProvider.ts` | Upstream's version. `delete-branch` is no longer held back, since store 2.1.0 decodes it.                                                                                          |
| `apps/web/src/components/Sidebar.tsx`                                    | Upstream's file with the personal header, selector, scope reads, and empty state reapplied.                                                                                        |
| `apps/web/src/components/ChatView.tsx`                                   | Upstream's file. The diff panel openings now live in hooks; see Decisions.                                                                                                         |
| `apps/web/src/components/DiffPanel.tsx`, `diffPanelStore.ts`             | Kept the re-export of `ThreadDiffPanel.tsx` and the working-tree default.                                                                                                          |
| `apps/web/src/components/diffs/AnnotatableCodeView.tsx`                  | Personal header props, which pass the file key and collapse state.                                                                                                                 |
| `apps/web/src/timestampFormat.ts`                                        | Kept `formatDayAwareMonthTimestamp` for the commit list.                                                                                                                           |
| Mobile review tests                                                      | Upstream's versions and deletions; mobile review follows upstream.                                                                                                                 |
| Web and server tests upstream deleted                                    | Upstream's deletions, except personal tests: `timestampFormat.test.ts` keeps only the month format tests, and the Codex protocol test keeps the completed sub-agent activity test. |

## Semantic repairs

- `resolveBaseBranchForNoUpstream` now returns a display base and a full comparison ref. The
  personal preview shows the display base and runs git with the comparison ref. Client-named
  bases in the per-file patch, file contents, and explicit preview paths resolve to
  `refs/heads/...` or `refs/remotes/...` first, so a tag named like the base branch no longer
  shadows it.
- The personal working-tree and branch-range counts use `--minimal`, matching the patch the panel
  renders.
- `ThreadDiffPanel.tsx` reads `useThreadCheckpointSummaries` and the module-level
  `updateClientSettings`, takes `visible`, revalidates the preview once each time the panel
  opens, and passes an empty `pendingFiles` to the code view, since it has no lazy placeholders.
- `buildPatchCacheKey` is exported again for `diffFileCache.ts`.
- `DiffFileTransition.test.tsx` became a browser test, since upstream removed
  `react-test-renderer` and runs every React test in a browser.

## Upstream tests

Adapted to the commits-only branch-range source:

- honors configured remote-qualified bases for Changes and ahead counts: the feature's edit to
  `upstream.txt` is committed.
- reads Changes totals without minimizing and keeps review diffs minimal: checks the working-tree
  source only.
- Changes compares the default branch with its tracking upstream, not origin: the status half is
  unchanged; the preview half expects no base, since the personal reader has none on the default
  branch itself.

The six tests the v0.1.0 fold left out stay out.

## Lint

Upstream applies the React Compiler lint rules to every web file. `ThreadDiffPanel.tsx` failed 25
of them in personal code that predates the fold. It now passes: state that reset in effects
adjusts during render, the load effect only fetches, and the reveal effect reads the latest file
through `useEffectEvent`. The panel was checked in the browser against a copy of real data:
working tree, commit, and turn diffs, file switching, the file cache, hunk navigation, reopening
the panel, and phone width.

## Verification

- Review contracts, Git driver, review service, Codex protocol, and provider compatibility tests:
  216 passed.
- GitHub pull request provider and API tests and the pull request service tests: 204 passed,
  including the four `delete-branch` tests that were skipped while it was held back.
- Web diff panel, file tree, commit list, hunk, diff store, timestamp, turn tree, and project
  scope tests: 138 passed. Sidebar, ChatView logic, right panel, code view, and diff transition
  tests, including browser tests: 154 passed. Mobile review model tests: 5 passed.
- Contracts, shared, client-runtime, Codex app server, GitHub source control, server, web,
  desktop, and mobile typechecks passed.
- No server, browser, desktop build, or phone was run as part of the merge.
