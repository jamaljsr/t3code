# Personal overlay

> This file exists only on the personal fork. Using T3 Code as shipped? Ignore it.

## What this fork is

`personal` overlays pingdotgg/t3code. Desktop/server run from this checkout. Daily mobile is the App Store app (1.0.3 at the time this was written). `apps/mobile` in the repo is not that binary.

`personal-compat` was the working branch that landed dual-serve + panel extract + these docs, then merged back into `personal`.

## Protocol

Store clients decode with **their** schemas. Version skew is a warning, not a gate. A missing required key becomes `Missing key at ...` on one RPC.

Forbidden: removing `ReviewDiffPreviewSource.diff` because desktop no longer reads it. Overlay #4 (`2aee5df2b`, "Review diffs one file at a time") did exactly that, and broke git-scope review on 1.0.3 (`["value"]["sources"][0]["diff"]`). Turn diffs kept working (different RPC).

Required shape for `review.getDiffPreview` sources:

- `diff`: unified patch, 120 KB cap, same `[truncated]` marker as before the one-file work
- `files`: manifest for the file-based desktop (and in-repo mobile) panel
- `truncated`: true if the patch **or** the file list hit a cap

New RPCs (`getDiffFilePatch`) are fine; store 1.0.3 never calls them.

## Desktop panel

Implementation: `apps/web/src/components/ThreadDiffPanel.tsx`.
`apps/web/src/components/DiffPanel.tsx` re-exports it. When merging `main`, keep-ours on `DiffPanel.tsx`. Port individual upstream fixes by hand if they still apply (do not take stacked-hunk UI).

## Folding upstream

On the machine the phone pairs to (`~/.t3`):

- Merge, do not rebase the whole fork.
- Prefer upstream **release tags** that match or are an additive superset of the store app.
- Do not run `main` HEAD as that server until the store protocol matches or you have checked every RPC 1.0.3 still calls.
- After a fold: `vp test run packages/contracts/src/review.test.ts` and `vp test run apps/server/src/vcs/GitVcsDriverCore.test.ts`; read auto-merged `GitVcsDriverCore.ts` and `packages/contracts` even without conflict markers; confirm working tree / branch on the phone.

Playground folds of `main` belong in a worktree that does not use `~/.t3` and that the phone does not pair to.
