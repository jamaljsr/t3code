# Personal overlay merge: v0.1.7

Upstream source: `v0.1.7` (`322f6544df`). Personal source: `e74d0095c3`.
Merge base: `2359643cff` (`v0.1.6`).

v0.1.7 still speaks orchestration protocol 2. Nothing new is held back.

## Conflict resolutions

| File                                             | Resolution                                                                                                                            |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------- |
| `apps/server/src/vcs/GitVcsDriverCore.ts`        | Personal reader kept. Upstream's inline single-file commit patch is not taken; the personal commit preview loads files one at a time. |
| `apps/server/src/vcs/GitVcsDriverCore.test.ts`   | Personal tests, with upstream's patch format test (now also covering `diff.suppressBlankEmpty`) and its odd repository path setup.    |
| `apps/server/src/project/AgentSessionScanner.ts` | Both: the personal real-path worktree checks and upstream's `isWindows` flag.                                                         |
| `apps/web/src/components/DiffPanel.tsx`          | Kept the re-export of `ThreadDiffPanel.tsx`.                                                                                          |
| `apps/web/src/timestampFormat.ts`, its test      | Upstream's time zone aware formatter, with `formatDayAwareMonthTimestamp` for the commit list built on the same day logic.            |
| Package versions                                 | Upstream's, then set to 0.1.7 with `scripts/update-release-package-versions.ts`.                                                      |

## Ports into the personal reader

Upstream fixed its own preview reader in ways that also apply to the personal one:

- The Effect 4.1.2 upgrade replaced the crypto service with `Digest`. The personal hashes use it.
- Working-tree file requests and commit requests resolve only the repository root, skipping branch and base discovery (#29115). The single-file path passes the resolved root to the file patch reader instead of resolving it again.
- Personal patch commands run with `diff.suppressBlankEmpty=false`, so blank context lines survive (#29579).
- The temporary index adds untracked files with `core.sparseCheckout=false`, so files outside a sparse cone are reviewed (#29880).
- Staged deletions are listed with `--no-renames`, so a deletion git pairs into a rename stays a deletion (#29571).

Not ported: `--submodule=short` from #29852. It only matters when `diff.submodule=log` is configured.

Upstream's "reads only the repository root" test is adapted: its commit request checks the personal commit manifest instead of an inline patch.

## Ports into the personal panel

- The comparison base picker stays available after a diff error, so a bad base can be changed from the panel (#27635). Upstream's `DiffPanel.browser.test.tsx` now renders the personal panel, with mocks for its hooks and a desktop-width viewport.
- The file tree column was already resizable, so #28244 needs no port.
- `DiffFileTransition.tsx` computes its `disableInteraction` default in the body. The upgraded React Compiler skips a component whose default parameter reads another parameter.

## Store compatibility

Contracts were compared between v0.1.6 and v0.1.7 for server-to-client values an older store client would fail to decode. None were found:

- `thread.tags-updated` is a new domain event type, in the same unions as the event types noted in the v0.1.6 fold.
- One-time scheduled tasks (`{ type: "once" }`) arrive in `ForwardCompatibleArray` task lists, which the store app already used.
- Secret provider references in settings are sent only to clients that announce `settingsSecretReferences`.
- New settings keys have decoding defaults or are optional. New RPCs (`getNativeChildWork`) are ones store clients do not call.
- The review contract did not change.

## Verification

- Git driver tests: 255 of 256 passed. "keeps generated worktree folders short without changing long branch names" still fails on macOS (`/var` versus `/private/var`).
- Agent session scanner tests: 64 of 65 passed. Upstream's new "still reads the git identity of repositories next to a blocked one" fails on macOS with upstream's unchanged scanner too.
- Review contract, timestamp, diff store, commit list, hunk nav, file tree, diff rendering, panel selection, turn diff tree, panel browser, file transition browser, and pull request link tests passed.
- Version-sensitive server tests (npm release, Codex adapter, model manifest) passed.
- Contracts, client-runtime, server, web, desktop, and mobile typechecks passed. `vp run check:changed v0.1.7` passed format, lint, knip, and React Compiler coverage. Its typecheck step fails in `apps/marketing` on a missing `typescript@7.0.2` path that nothing in the lockfile references; `astro check` in `apps/marketing` passes on its own.
- No server, browser, desktop build, or phone was run as part of the merge.
