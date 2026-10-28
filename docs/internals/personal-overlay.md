# Personal overlay

> This file exists only on the personal fork. Using T3 Code as shipped? Ignore it.

## What this fork is

`personal` overlays pingdotgg/t3code. This checkout builds the desktop binaries that are installed and run daily; the dev app runs from it only for testing. Daily mobile is the App Store app (2.1.0 at the time this was written). `apps/mobile` in the repo is not that binary, and its review screen follows upstream unchanged.

## Protocol

Store clients decode with **their** schemas. A missing required key becomes `Missing key at ...` on one RPC.

The server and every client must agree on the orchestration protocol version (`ORCHESTRATION_PROTOCOL_VERSION` in `packages/contracts/src/environment.ts`). The server rejects a socket or thread HTTP read from any other version, so store 1.x cannot connect to this fork at all. Store 2.0 and this fork both speak protocol 2.

Required shape for `review.getDiffPreview` sources:

- `diff`: unified patch, 120 KB cap, with the `[truncated]` marker. Upstream still requires it.
- `files`: upstream's statistics, `{ path, previousPath, additions, deletions }` with numeric counts. Store clients require this exact shape; a personal field under this key breaks their review screen.
- `manifest`: the personal file list for the desktop panel, with change types and `null` counts for unknown or binary files. Store clients ignore it.
- `truncated`: true if the patch **or** the file list hit a cap.

Store clients load a truncated source one file at a time through `getDiffPreview` with a `file` input. The server answers with only that source, its patch, and a one-entry `files`.

New RPCs (`getDiffFilePatch`, `getCommitDiffPreview`) are fine; store clients never call them.

## Held back for store clients

A value the store app's schema does not list fails the whole response, not just that field. Upstream values that are newer than the store app are held back here until the store app catches up. Each fold, check every entry and remove the ones the store app now decodes.

Nothing is held back at the moment. Store 2.1.0 decodes `"delete-branch"`, and it reads pull request action, merge method, update method, and verdict lists with `ForwardCompatibleArray`, so new values in those lists no longer need holding back. To hold a value back, stop the server from reporting it, skip the upstream tests that assert it with a comment pointing here, and list it in this section with where to restore it.

## Review sources

The personal reader in `apps/server/src/vcs/GitVcsDriverCore.ts` replaces upstream's preview reader:

- The working-tree source compares the working tree, including untracked files, with `HEAD`.
- The branch-range source compares commits only: `base...HEAD`, plus the branch's commit list for the desktop commit filter.

Upstream's branch source ("Changes") instead compares the working tree with the merge base, so it also includes uncommitted and untracked files. Store clients show the personal meaning when connected to this fork. The desktop panel and the generic panel openings in `ChatView.tsx` default to the working tree; upstream defaults to its Changes view.

## Desktop panel

Implementation: `apps/web/src/components/ThreadDiffPanel.tsx`.
`apps/web/src/components/DiffPanel.tsx` re-exports it. When merging `main`, keep-ours on `DiffPanel.tsx`. Port individual upstream fixes by hand if they still apply (do not take stacked-hunk UI). Find in diffs comes from the shared code view; the panel never collapses files, so it passes a no-op reveal callback.

The personal tree is `diffs/ThreadDiffFileTree.tsx`. Upstream's `diffs/DiffFileTree.tsx` is used
by the PR Code tab and can evolve independently.

## Folding upstream

Completed folds should leave a maintenance note with the source refs, conflict resolutions,
semantic repairs, and compatibility audit. See
[`personal-overlay-v0.0.34-merge.md`](personal-overlay-v0.0.34-merge.md) for the first example, and [v0.1.3](personal-overlay-v0.1.3-merge.md) for the latest fold.

On the machine the phone pairs to (`~/.t3`):

- Merge, do not rebase the whole fork.
- Fold an upstream ref with the same orchestration protocol version as the store app. Store builds can come from `main` ahead of any release tag, so check the RPC shapes rather than the version number.
- Before running a fold as that server, check every RPC the store app calls against its schemas, including new literal values in enums; `packages/contracts/src/review.test.ts` pins the review source shape, which store 2.0 shares with 1.3.0.
- Go through [Held back for store clients](#held-back-for-store-clients): restore what the store app now decodes, and add anything new it would reject.
- After merging a release tag, run `node scripts/update-release-package-versions.ts <tag version>` and commit the result. Upstream writes the release version into the package files only at build time, so a tag still carries the previous version. The server reports that version, and provider compatibility policies in `apps/server/src/provider/model-manifest.json` are chosen by it; a stale version can flag a supported provider as broken. If upstream's tests fail on the version change, look for their fix on `main` after the tag.
- After a fold: `vp test run packages/contracts/src/review.test.ts` and `vp test run apps/server/src/vcs/GitVcsDriverCore.test.ts`; read auto-merged `GitVcsDriverCore.ts` and `packages/contracts` even without conflict markers; confirm working tree / branch on the phone.
- Upstream review tests that assume its Changes meaning do not apply to the personal reader. Adapt the ones that check something the personal reader also does; leave out the rest and list them in the fold note.

Playground folds of `main` belong in a worktree that does not use `~/.t3` and that the phone does not pair to.
