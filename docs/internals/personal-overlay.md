# Personal overlay

> This file exists only on the personal fork. Using T3 Code as shipped? Ignore it.

## What this fork is

`personal` overlays pingdotgg/t3code. This checkout builds the desktop binaries that are installed and run daily; the dev app runs from it only for testing. Daily mobile is the App Store app (1.3.0 at the time this was written). `apps/mobile` in the repo is not that binary, and its review screen follows upstream unchanged.

`personal-compat` was the working branch that landed dual-serve + panel extract + these docs, then merged back into `personal`.

## Protocol

Store clients decode with **their** schemas. Version skew is a warning, not a gate. A missing required key becomes `Missing key at ...` on one RPC.

Forbidden: removing `ReviewDiffPreviewSource.diff` because desktop no longer reads it. Overlay #4 (`2aee5df2b`, "Review diffs one file at a time") did exactly that, and broke git-scope review on 1.0.3 (`["value"]["sources"][0]["diff"]`). Turn diffs kept working (different RPC).

Required shape for `review.getDiffPreview` sources:

- `diff`: unified patch, 120 KB cap, same `[truncated]` marker as before the one-file work
- `files`: upstream's statistics, `{ path, previousPath, additions, deletions }` with numeric counts. Store 1.3.0 requires this exact shape; a personal field under this key breaks its review screen.
- `manifest`: the personal file list for the desktop panel, with change types and `null` counts for unknown or binary files. Store clients ignore it.
- `truncated`: true if the patch **or** the file list hit a cap

Store 1.3.0 loads a truncated source one file at a time through `getDiffPreview` with a `file` input. The server answers with only that source, its patch, and a one-entry `files`.

New RPCs (`getDiffFilePatch`, `getCommitDiffPreview`) are fine; store clients never call them.

File attachments also need an opt-in. Store 1.0.3 accepts only image attachments;
one video or PDF can prevent an entire thread from loading. Thread HTTP reads use
`x-t3-file-attachments: true`, and socket subscriptions use `fileAttachments: true`.
Without the opt-in, filter non-image attachments from outgoing snapshots and
message events, including replay. Never remove them from persisted messages.

## Desktop panel

Implementation: `apps/web/src/components/ThreadDiffPanel.tsx`.
`apps/web/src/components/DiffPanel.tsx` re-exports it. When merging `main`, keep-ours on `DiffPanel.tsx`. Port individual upstream fixes by hand if they still apply (do not take stacked-hunk UI).

The personal tree is `diffs/ThreadDiffFileTree.tsx`. Upstream's `diffs/DiffFileTree.tsx` is used
by the PR Code tab and can evolve independently.

## Folding upstream

Completed folds should leave a maintenance note with the source refs, conflict resolutions,
semantic repairs, and compatibility audit. See
[`personal-overlay-v0.0.34-merge.md`](personal-overlay-v0.0.34-merge.md) for the first example, and [v0.0.43-nightly](personal-overlay-v0.0.43-nightly-merge.md) for the latest fold.

On the machine the phone pairs to (`~/.t3`):

- Merge, do not rebase the whole fork.
- Fold an upstream ref at least as new as the store app's protocol. Store builds can come from `main` ahead of any release tag, so check the RPC shapes rather than the version number.
- Before running a fold as that server, check every RPC the store app calls against its schemas; `packages/contracts/src/review.test.ts` pins the review shapes for 1.0.3 and 1.3.0.
- After a fold: `vp test run packages/contracts/src/review.test.ts` and `vp test run apps/server/src/vcs/GitVcsDriverCore.test.ts`; read auto-merged `GitVcsDriverCore.ts` and `packages/contracts` even without conflict markers; confirm working tree / branch on the phone.

Playground folds of `main` belong in a worktree that does not use `~/.t3` and that the phone does not pair to.
