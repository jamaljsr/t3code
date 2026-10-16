# Personal overlay merge: v0.1.0

Upstream source: `v0.1.0` (`81493efb71`). Personal source: `154a3fc5a2`.
Merge base: `6c8fed35dd` (`v0.0.45`).

v0.1.0 is the first stable release of upstream's new orchestrator. It speaks orchestration
protocol 2, which App Store 2.0 requires and store 1.x cannot use.

## Decisions

- **Store 1.x compatibility removed.** The file-attachment opt-in, the narrowed thread stream,
  and their tests lived in the old orchestrator, which upstream deleted. A protocol 2 server
  rejects 1.x sockets and thread HTTP reads, so the code had no reachable client. Persisted
  attachments are unaffected.
- **Branch naming follows upstream.** The personal prefix stripping lived in the old
  `ProviderCommandReactor`. Upstream's **Settings → Source Control → Worktree branch naming**
  covers it: a static mode with an empty prefix adds nothing. The default prefix is `t3`.
- **Personal review reader and defaults kept.** The branch-range source still compares commits
  only, and the desktop panel and generic panel openings still default to the working tree.
  Upstream's Changes view, which includes uncommitted and untracked files, was not taken.

## Conflict resolutions

| File                                                                          | Resolution                                                                                                                                                                                                                                       |
| ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `apps/server/src/vcs/GitVcsDriverCore.ts`                                     | Personal `getReviewDiffPreview` and `getReviewDiffFileContents` on top of upstream's other Git changes. Restored `parseReviewNumstat` and `prepareReviewIndex`, which upstream's new status totals use.                                          |
| `apps/server/src/review/ReviewService.ts`                                     | Upstream's workspace check, which allows registered project roots and managed worktree directories, plus the personal rule that allows any active thread's worktree. That rule now reads `getThreadWorktreePaths`, which skips archived threads. |
| `apps/server/src/ws.ts`                                                       | Upstream's file, with the two personal review handlers added.                                                                                                                                                                                    |
| `apps/server/src/auth/RpcAuthorization.ts`                                    | Upstream's split scopes. Personal review RPCs use `AuthFilesystemReadScope` like the upstream review RPCs.                                                                                                                                       |
| `apps/web/src/components/DiffPanel.tsx`                                       | Kept the re-export of `ThreadDiffPanel.tsx`.                                                                                                                                                                                                     |
| `apps/web/src/components/Sidebar.tsx`                                         | Kept the personal header and multi-project selector. Dropped upstream's single-project scope picker. Kept upstream's machine labels for projectless threads, draft context menus, and stable callbacks.                                          |
| `apps/web/src/components/diffs/AnnotatableCodeView.tsx`                       | Both the personal header props and upstream's find reveal callback.                                                                                                                                                                              |
| `apps/web/src/diffPanelStore.test.ts`, `apps/web/src/timestampFormat.test.ts` | Both sides' tests.                                                                                                                                                                                                                               |
| Old orchestrator, attachment, and branch-prefix files                         | Took upstream's deletions or versions.                                                                                                                                                                                                           |

## Semantic repairs

- `ThreadDiffPanel.tsx` reads the thread shell and projection and uses run IDs, matching
  upstream's panel after the orchestrator change. It passes a no-op find reveal callback, since
  it never collapses files, which also brings Cmd+F find in diffs to the panel.
- `RpcInstrumentation.ts` registers the personal review RPCs under the `review` aggregate.
- `apps/mobile/src/features/review/useReviewSections.test.ts` gained `manifest: []` in a new
  upstream fixture.
- Upstream changed the diff panel default and its three generic openings in `ChatView.tsx` to
  the branch view. All four were returned to the working tree.
- Two upstream reader fixes were ported to the personal reader. A failed working-tree patch read
  now fails the preview instead of returning an empty diff; an unresolvable base ref still
  returns the working tree. More than 5,000 untracked files skips their patches and marks the
  working-tree source truncated.

## Upstream tests

Six new upstream review tests were left out because they assert the Changes meaning or
upstream's reader internals:

- reads complete tracked and untracked manifests beyond 1 MB
- loads merge-base and disk contents for Changes expansion
- Changes combines commits, uncommitted edits, and untracked files
- Changes on the default branch compares with its remote copy
- Changes accepts an explicit base on a detached HEAD and rejects a bad one
- Changes compares with the empty tree before the first commit

Two of these also cover behavior the personal reader lacks independent of the Changes meaning:
comparing the default branch with its remote copy, and an explicit base on a detached HEAD.

Two were adapted: the large patch test expects untracked files only in the working tree, and the
untracked cap test checks the working-tree source.

## Verification

- Review contracts, Git driver, review service, and manifest tests: 191 passed.
- Web diff panel, file tree, commit list, hunk, sidebar, project scope, diff store, timestamp,
  and ChatView logic tests: 707 passed.
- Client runtime auth and sync, shared Git, contracts review, and Codex protocol tests:
  175 passed. Server authorization, RPC instrumentation, and socket tests: 37 passed. Mobile
  review tests: 18 passed.
- Contracts, shared, client-runtime, server, web, desktop, and mobile typechecks passed.
- Targeted lint on the touched files reported warnings and no errors. Merge-introduced unused
  imports were removed; the remaining warnings exist in upstream's versions of the same files.
- No server, browser, desktop build, or phone was run as part of the merge.
