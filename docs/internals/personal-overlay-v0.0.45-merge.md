# Personal overlay merge: v0.0.45

Upstream source: `v0.0.45` (`6c8fed35dd`). Personal source: `15c954406d`.
Merge base: `451afcb22d` (`v0.0.44`).

## Personal behavior

Git combined all overlapping files without conflicts. Every personal-only file is
byte-identical to the personal source, and every file that differs from `v0.0.45`
is part of the overlay.

Upstream additions in shared files are additive. The contracts and RPC authorization
gain `projects.ensureScratch`, `projects.createNew`, and the `fresh` provider refresh
flag next to the personal review RPCs. The server keeps the personal review and
attachment handling alongside the new scratch and new-project handlers. The sidebar
keeps the personal multi-project scope; the Working shelf beta sorts within the
scoped thread list.

Upstream's diff header fix in `diffs/StyledDiffCodeView.tsx` reaches only the PR Code
tab. The personal `ThreadDiffPanel` does not use that view. Review sources keep `diff`,
numeric `files` statistics, and the personal `manifest`.

No manual conflict resolutions or semantic repairs were needed.

## Verification

- `review.test.ts` and `GitVcsDriverCore.test.ts`: 132 tests passed.
- Every non-mobile test file the overlay touches, plus the sidebar drag and logic
  tests: 2385 tests passed, 13 skipped. The overlay's mobile tests: 129 passed.
- Server, web, desktop, mobile, contracts, client-runtime, and shared typechecks passed.
- Targeted lint on the automatically combined runtime files passed with warnings and no errors.
- Browser checks, the installed App Store client, and the new scratch and new-project
  flows against a live server were not exercised.

The stable release is the merge target. Changes from later nightlies are excluded.
