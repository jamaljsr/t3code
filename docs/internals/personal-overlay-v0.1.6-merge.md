# Personal overlay merge: v0.1.6

Upstream source: `v0.1.6` (`2359643cff`). Personal source: `aad5c98bdd`.
Merge base: `d2c440312e` (`v0.1.3`).

v0.1.6 still speaks orchestration protocol 2. The App Store app was 2.1.0 at the time of this
fold, built from upstream `main` after `4eae8ae011`. Nothing new is held back.

## Decisions

- **Sidebar follows upstream.** Upstream's project filter selects several projects with
  Shift-click or Shift+Enter and remembers the selection across reloads, which covers the
  personal multi-project selector. `Sidebar.tsx` is upstream's file, including its header, and the
  personal `ProjectScopeSelector.tsx`, `projectScopeSelection.ts`, their tests, and their design
  doc are gone. The sidebar no longer conflicts on folds.
- **Diff selections use upstream's store shape.** `diffPanelStore.ts` is upstream's, with the
  working-tree default kept. A selected commit is `{ kind: "commit", sha, baseRef }` instead of a
  commit on the branch selection, so commit links and the commit list share it. A commit link can
  select a commit on any local branch, so the panel no longer requires the selected commit to be in
  the branch's commit list.
- **Commit links read through the personal reader.** Upstream's commit link handler asks
  `review.getDiffPreview` with `commitSha` and expects a `commit` source. The personal reader
  answers with its commit preview, relabelled `commit`, after upstream's `resolveReviewCommit`
  check (full SHA, present locally without a lazy fetch, parent available in shallow clones).
  Store clients never send `commitSha`, so they never see the new source kind.

## Conflict resolutions

| File                                             | Resolution                                                                                                    |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------- |
| `apps/server/src/vcs/GitVcsDriverCore.ts`        | Personal reader kept, with the `commitSha` path added. Upstream's branch commit list and commit helpers kept. |
| `apps/server/src/vcs/GitVcsDriverCore.test.ts`   | Personal tests, plus upstream's commit list test and two commit link tests adapted to the personal reader.    |
| `apps/server/src/review/ReviewService.ts`        | Upstream's subject table, with the personal `getDiffFilePatch` entry.                                         |
| `apps/server/src/vcs/VcsDriver.ts`               | Upstream's. The optional `getDiffPreview` member had no callers.                                              |
| `packages/contracts/src/review.ts`               | Both: the personal commit preview input and upstream's branch commits and `commit` source kind.               |
| `apps/web/src/components/Sidebar.tsx`            | Upstream's.                                                                                                   |
| `apps/web/src/components/DiffPanel.tsx`          | Kept the re-export of `ThreadDiffPanel.tsx`.                                                                  |
| `apps/web/src/components/ChatView.tsx`           | Personal working-tree reset on generic openings, skipped when a commit link asked to keep its selection.      |
| `apps/web/src/diffPanelStore.ts`, its test       | Upstream's store with the working-tree default. Personal store tests rewritten for the `commit` selection.    |
| `apps/web/src/components/chat/DiffStatLabel.tsx` | Personal dash for zero counts, on upstream's markup without parentheses.                                      |
| `apps/web/src/lib/diffRendering.ts`              | Upstream's untrimmed patch keys, with `buildPatchCacheKey` still exported for the personal file cache.        |
| `scripts/effect-budget.json`                     | Deleted, as upstream did. Each effect now states its reason at the call site.                                 |
| Package versions                                 | Upstream's, then set to 0.1.6 with `scripts/update-release-package-versions.ts`.                              |

Upstream's "diffs a root commit against the empty tree but rejects a shallow boundary" and
"previews one selected commit, a merge against its first parent" tests are adapted: the personal
commit preview has no inline patch and loads files one at a time, so the adapted tests check the
source kind, refs, and manifest instead of `diff`.

## Ports into the personal panel

`ThreadDiffPanel.tsx` now handles every selection kind in `diffPanelStore.ts`:

- Tool call diffs from the timeline (#26304), rendered like a turn patch, with upstream's
  truncation, omitted-files, and recorded-content notices.
- Commits from links and from the commit list.

It also gained upstream's hide test files toggle (#26730), the F6 focus target (#25877), the file
header right-click menu, the copy path button, and the file read access message for connections
that cannot read files.

`docs/user/source-control.md` points commit review at the personal commit list instead of
upstream's **Commits** source picker.

## Lint

Upstream replaced the effect budget with a reason on each effect and added rules against outset
focus rings, manual memoization, raw `ResizeObserver`, index keys, and polling loops in tests. The
personal diff panel, file tree column, commit list, file tree, file transition, hunk scrollbar
marks, and `diffFileFocus.test.ts` were updated to match. The commit list resets its expanded
bodies by being keyed on its list identity instead of in an effect.

## Store compatibility

Contracts were compared between `4eae8ae011` and v0.1.6 for server-to-client values a 2.1.0
client would fail to decode. None were found:

- New turn item and thread event types (`link_request`, `thread.guest-share-updated`) land in
  unions the 2.1.0 app decodes with forward-compatible arrays, so unknown members are dropped.
- The `commit` review source is only returned for `commitSha` requests.
- Other new literals (`muse` usage, `config_locked`, new keybinding commands, `environment`
  composer records, `simlock` device hosts) are in lenient arrays or in new keys the app ignores.
- RPCs removed upstream are ones the 2.1.0 app does not call.

## Verification

- Review contract test: 6 passed. Git driver, review service, and manifest tests: 244 of 245
  passed. "keeps generated worktree folders short without changing long branch names" fails on macOS on
  upstream's unchanged test: the temp folder is under `/var`, a symlink to `/private/var`.
- Web diff store, commit list, file focus, file tree, hunk nav, tool call diff, diff rendering,
  and panel selection tests: 98 passed. Commit link and file transition browser tests: 9 passed.
- Version-sensitive server tests (npm release, Codex adapter, model manifest): 157 passed.
- Contracts, client-runtime, server, web, desktop, and mobile typechecks passed. Lint and format
  passed on every file where the fork differs from v0.1.6.
- Upstream's pre-commit hook now runs `knip:check`. `knip.jsonc` ignores the unused-file and
  unused-export reports for the upstream modules only upstream's diff panel uses
  (`DiffFileStatus.tsx`, `useReviewFilePatches.ts`, `useThreadRouteTarget.ts`, `diffCollapse.ts`,
  `diffFileContents.ts`). Unused exports in fork-only code are no longer exported. `knip:check`
  passes.
- No server, browser, desktop build, or phone was run as part of the merge.
