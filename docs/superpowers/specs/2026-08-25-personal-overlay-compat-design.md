# Personal overlay compatibility

Make this fork’s server speak App Store mobile’s review protocol again, isolate the custom desktop diff panel from upstream’s `DiffPanel.tsx`, and write overlay guidance so later agents do not break store clients.

Work happens on `personal-compat` and merges back into `personal` when complete. `personal` is the long-lived overlay. `personal-compat` is not.

## Problem

`personal` customized the thread diff panel (file tree, commit list, one-file preview) and **removed** `ReviewDiffPreviewSource.diff`. Desktop and in-repo mobile use a `files` manifest plus per-file RPCs.

Daily mobile is **App Store 1.0.3**, not this repo. That binary still requires `sources[n].diff`. Git-scope review fails with `Missing key at ["value"]["sources"][0]["diff"]`. Turn diffs still work (different RPC). Working tree / branch show empty.

The one-file spec listed dual-serving `diff` as a non-goal and assumed web, desktop, and mobile ship together. That is false for this fork.

`DiffPanel.tsx` is 1,500+ lines and is the only serious merge hotspot against `main`. Most other overlay files are new and merge cleanly.

A free Apple Personal Team install exists in this repo but **expires about every 7 days**. That is a hard blocker. Store mobile stays the daily client.

## Goals

- Store 1.0.3 can open working tree and branch diffs on the desktop/server this phone pairs to.
- Desktop keeps the file-based one-file panel (tree, commit list, per-file fetch).
- Later folds of upstream into `personal` do not require resolving a rewritten `DiffPanel.tsx`.
- Agents on this checkout follow a written protocol floor: additive contracts; never assume clients ship together.

## Non-goals

- Shipping the in-repo one-file mobile UI to the App Store.
- Installing from this repo onto the phone (Personal Team / 7-day signing).
- A settings toggle between hunk-stack and file pane.
- Restoring upstream’s stacked hunk UI on desktop.
- Merging the ~384 `main` commits in this work.
- Running `main` HEAD as the daily server the phone pairs to.
- Client-version switching that omits `diff` for “new” clients (always fill both unless preview latency later forces it).
- Rewriting in-repo mobile to match 1.0.3’s hunk UI.
- Extracting `ReviewSheet.tsx` unless it becomes a merge hotspot later.

## Surfaces

| Surface                        | Role in this work                                                             |
| ------------------------------ | ----------------------------------------------------------------------------- |
| Server `review.getDiffPreview` | Dual-serve `diff` + `files`                                                   |
| Contracts `review.ts`          | Restore required `diff`; keep `files` and per-file RPCs                       |
| Web / desktop `DiffPanel`      | Stay file-based; then move body to a file `main` will never have              |
| App Store 1.0.3                | Protocol floor. Unchanged binary. Uses `diff`.                                |
| In-repo `apps/mobile`          | May keep file-based review for simulator/sideload experiments. Not the floor. |
| Settings / command palette     | Unchanged                                                                     |
| Pull-request Code tab          | Unchanged                                                                     |

## Decisions

| Topic                      | Choice                                                                                            |
| -------------------------- | ------------------------------------------------------------------------------------------------- |
| Daily mobile               | App Store (today 1.0.3). Not a Personal Team build.                                               |
| Protocol floor             | Whatever store binary is actually paired. Additive schemas only.                                  |
| Preview payload            | Always send `diff` (unified patch, 120 KB cap) **and** `files` (manifest).                        |
| Who reads what             | 1.0.3 reads `diff`, ignores extra keys. Desktop reads `files` + per-file RPCs, ignores `diff`.    |
| `truncated`                | True if the **patch** or the **file list** hit a cap.                                             |
| Turn diffs                 | Unchanged checkpoint RPC.                                                                         |
| Desktop viewer             | One viewer: the file-based panel. No toggle.                                                      |
| `DiffPanel.tsx`            | After the wire fix: re-export only. Body in e.g. `ThreadDiffPanel.tsx`. Future merges: keep-ours. |
| Upstream fold in this work | None. Later merge into `personal`, prefer release tags that match the store protocol.             |
| Working branch             | `personal-compat` → merge into `personal` when done.                                              |

## Wire

### `ReviewDiffPreviewSource`

Required again:

- `diff: string` — unified patch for working-tree or `base...HEAD`, same 120 KB cap and `[truncated]` marker as before the one-file change.

Kept:

- `files` manifest, `diffHash` (manifest hash), listing `truncated`, optional commit-list fields.
- `review.getDiffFilePatch` and `review.getDiffFileContents`.

  1.0.3’s schema requires `diff` and has no `files`. Extra keys are ignored. This fork’s schema requires both `diff` and `files` so encode always includes them. Desktop ignores `diff` at the UI.

Do not send `diff: ""` when there are changes. 1.0.3 would show “No changes to show”.

### `getReviewDiffPreview`

Today the driver only runs name-status / numstat / untracked listing. Dual-serve runs that listing **in parallel with** the old unified `git diff` (working tree vs `HEAD`, branch range vs `base...HEAD`, including untracked handling as before `#4` for the patch string).

`truncated` on a source is true if listing **or** patch output was cut.

Turn/checkpoint diffs are out of scope.

## Desktop isolation

After the phone works:

1. Move the current panel implementation to `apps/web/src/components/diffs/ThreadDiffPanel.tsx` (name may vary; must be a path `main` does not have).
2. `apps/web/src/components/DiffPanel.tsx` re-exports that default (and any existing `DiffWorkerPoolProvider` re-export).
3. Lazy import in `ChatView` can stay `import("./DiffPanel")`.
4. Hand-port from upstream `DiffPanel` if missing: nested project path open (`#6174`), tooltip lint (`#7209`). Do not take upstream’s stacked-file body.

Existing overlay files stay where they are (`DiffFileTree`, `diffPanelGitFileLoad`, `reviewDiffManifest`, …).

## Folding upstream (after this work)

On the daily desktop/server the phone pairs to (`~/.t3`):

- Merge, do not rebase the whole fork. `git rerere` is worth enabling after the first re-export resolve.
- Prefer **upstream release tags** that match or are a known additive superset of the store app.
- Do not run `main` HEAD as that server until a store release speaks that protocol, or the fold is checked additive for every RPC 1.0.3 still calls.
- After each fold: review contract tests; read auto-merged `GitVcsDriverCore.ts` and `packages/contracts` even without conflict markers; confirm working tree / branch on the phone.

Playground: merge `main` in a worktree that does **not** use `~/.t3` and that the phone does not pair to.

## Agent guidance

New files `main` will not have:

1. `.cursor/rules/personal-overlay.mdc` — `alwaysApply: true`, under ~50 lines. Protocol floor, additive contracts, no “clients ship together”, new UI in new files, `DiffPanel.tsx` is a re-export.
2. `docs/internals/personal-overlay.md` — longer why/how, dual-serve, extract map, merge cadence, `#4` as the forbidden example.

Pointer at the end of `AGENTS.md`: if `docs/internals/personal-overlay.md` exists, follow it over any same-version client assumption. If a merge drops that sentence, the cursor rule still applies.

Correct `docs/superpowers/specs/2026-08-22-diff-panel-one-file-preview-design.md` so dual-serving `diff` is no longer a non-goal and “clients ship together” is no longer a decision.

## Implementation order

1. **Unbreak 1.0.3** — contract + `getReviewDiffPreview` dual-serve + tests. Confirm on the phone. Only wire change.
2. **Extract `ThreadDiffPanel`** — re-export; desktop behavior unchanged.
3. **Overlay docs + one-file spec correction.**
4. **Stop.** Merge `personal-compat` into `personal`. Do not fold `main` in this work.

## Test plan

- Contract: source with both `diff` and `files` decodes; a 1.0.3-shaped decode (requires `diff`, schema has no `files`) succeeds on a dual payload and still receives a non-empty `diff` when there are git changes.
- Server: preview sources include a real unified patch and a matching file list; truncation flags if either cap hits.
- Desktop: still one-file pane from `files` / per-file RPCs (existing tests).
- Phone (human): working tree and branch diffs render on 1.0.3; turn diffs still render; the `sources[0].diff` missing-key banner is gone.
- After extract: `DiffPanel.tsx` is only a re-export; `ChatView` still loads the panel.

## Risks

- Dual-serve puts the 120 KB patch back on the wire for every preview, including desktop. Desktop ignores it; store mobile needs it. Revisit only if preview latency is a problem.
- Auto-merged `GitVcsDriverCore.ts` on a **later** `main` fold can be semantically wrong without conflict markers. Read it.
- `truncated` meaning is slightly overloaded (patch vs listing). Conservative OR is correct for 1.0.3.
