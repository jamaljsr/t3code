# Personal overlay merge: v0.1.3

Upstream source: `v0.1.3` (`d2c440312e`). Personal source: `bac7c0d0fd`.
Merge base: `044f07257c` (`v0.1.2`).

v0.1.3 still speaks orchestration protocol 2. Its compact thread snapshot IDs
(`orchestrationV2IdTable.ts`) are opt-in per client, so store clients that do not ask for them
are unaffected. The App Store app was 2.1.0 at the time of this fold. Nothing new is held back.

## Decisions

- **Personal sidebar scope kept on upstream's route reveal.** Upstream now decides during render
  whether a route reveal widens the scope (`resolveSidebarRouteReveal`) and scrolls the active row
  from its ref callback. The personal selection feeds that decision, and a widening reveal clears
  it to all projects. Upstream's scoped thread search is limited to every selected project.
- **Personal header kept.** The personal search, new thread, project selector, and new project
  layout stays in `Sidebar.tsx`. It takes upstream's new search field focus styles and icon color
  from `SidebarThreadHeader.tsx`.
- **Diff panel refreshes follow upstream.** Reopening the panel and window focus go through
  `useLiveRefresh`, as upstream's diff panel does. A diff read within the last ten seconds counts
  as the revalidation, so focus no longer refreshes every time.

## Conflict resolutions

| File                                                    | Resolution                                                                                                      |
| ------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `apps/server/src/vcs/GitVcsDriverCore.ts`               | Personal reader and comments kept; upstream's new import and its shortened comments on its own code.            |
| `apps/web/src/components/Sidebar.tsx`                   | Upstream's file with the personal scope hook, header, context menu filter, and empty state reapplied.           |
| `apps/web/src/components/DiffPanel.tsx`                 | Kept the re-export of `ThreadDiffPanel.tsx`.                                                                    |
| `apps/web/src/components/chat/DiffStatLabel.tsx`        | Personal dash for zero counts, with upstream's renamed `-foreground` colors.                                    |
| `apps/web/src/components/diffs/AnnotatableCodeView.tsx` | Personal header filename suffix and metadata props, with upstream's `renderAnnotation` signature.               |
| `apps/web/src/lib/turnDiffTree.test.ts`                 | Both sides' tests.                                                                                              |
| `packages/client-runtime/src/state/review.ts`           | Upstream's shared `diffPreview` family and revision-keyed patch refresh, plus the personal `commitDiffPreview`. |
| `pnpm-workspace.yaml`, `pnpm-lock.yaml`                 | Upstream's. The only personal change was the cherry-picked #23798, which v0.1.3 contains.                       |

## Lint

Upstream now holds each web file to a budget of React effects (`scripts/effect-budget.json`),
bans `useMemo` in compiled files, and rejects setState in effects.

- `ThreadDiffPanel.tsx` had five effects. The reopen and focus refreshes became one
  `useLiveRefresh` call. The remaining three (turn selection cleanup, file loading, file reveal)
  match the jobs upstream's diff panel keeps effects for, and the file has its own budget entry of 3. Upstream's `DiffPanel.tsx` entry stays, so the budget file merges cleanly next time.
- `ProjectScopeSelector.tsx` reconciles the selection during render instead of in an effect. The
  stored selection keeps projects that disappear, so a project that returns rejoins the scope.

## Verification

- Review contracts and Git driver tests: 189 passed. Review service and manifest tests: 13
  passed.
- Web sidebar, project scope, route reveal, diff panel, code view, file tree, diff store, and
  diff library tests, including browser tests: 492 passed.
- Server provider tests: 685 passed. `ClaudeSkills.test.ts` "merges plugin enablement and selects
  installs in native registry order" fails on macOS on unmodified v0.1.3 code: the temp folder is
  under `/var`, a symlink to `/private/var`, so the project path comparison misses. Upstream CI
  runs on Linux.
- Contracts, client-runtime, server, web, and desktop typechecks passed. Lint passed on every file
  where the fork differs from v0.1.3.
- No server, browser, desktop build, or phone was run as part of the merge.
