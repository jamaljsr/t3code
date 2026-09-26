# Personal overlay merge: v0.0.43-nightly.20260926.2282

Merged upstream `main` at `6530de0339` (tag `v0.0.43-nightly.20260926.2282`) into `personal`
from `03951b07ad`, with `v0.0.42` (`719a76ca1d`) as the merge base. The trigger was App Store
1.3.0, whose review screen failed with `Missing key at ["value"]["sources"][0]["files"][0]["previousPath"]`
against the v0.0.42 fold.

## Resolutions

- Review protocol: upstream's `files` statistics and the personal file list both claimed
  `ReviewDiffPreviewSource.files`. Upstream keeps `files`; the personal list moved to `manifest`.
  `files` is derived from the manifest, with `null` counts sent as zero.
- The personal review reader stays. It gained upstream's per-file `file` input, which returns only
  the requested source. Upstream's rewritten preview reader was not taken.
- The desktop panel keeps the personal implementation. Upstream's working-tree default (#12139)
  was ported by hand, and the combobox props upstream removed were dropped from the base-ref picker.
  The upstream `diffFilePatch` query keeps its name; the personal patch command is `getDiffFilePatch`.
- The in-repo mobile review screen takes upstream's version. The personal one-file mobile loader
  (`useReviewGitFileLoad.ts`, `reviewGitFileLoad.ts`) was removed.
- The sidebar keeps the personal header and multi-project selector. Upstream's thread-menu project
  filter (#8719) selects or clears a single project within the multi-project scope.
- The Codex protocol takes upstream's regeneration for Codex 0.156. The personal pre-0.156
  compatibility shim and its test were removed; upstream marks older Codex unsupported.
- Thread snapshots and replay carry both opt-ins: personal `fileAttachments` and upstream
  `reasoningMessages`.

## Semantic repairs

Upstream's new review tests, run against the personal reader, found these gaps. All are fixed:

- Previews rewrote the user's index through `git status` and `git diff`. Review reads now resolve
  the repository without `git status` and run with `GIT_OPTIONAL_LOCKS=0`.
- Untracked files outside a nested project directory were missing. Previews now read from the
  worktree root.
- A repository without commits showed nothing staged. The working tree compares with the empty tree.
- File patches treated paths as globs. Pathspecs are literal.
- The manifest parser trimmed paths and could not read quoted names. It now reads `-z` output.

## Compatibility and verification

`packages/contracts/src/review.test.ts` decodes sources with the 1.0.3 and 1.3.0 schemas.
Review server, contract, Codex, orchestration, web diff and sidebar, and mobile review tests
passed. Server, web, desktop, mobile, contracts, client-runtime, shared, and Codex typechecks
passed.

Upstream added the `shadcn/no-restyle` and `shadcn/no-arbitrary-values` lint rules after v0.0.42.
The personal diff panel, sidebar header, project selector, and diff file tree use upstream's
component variants to satisfy them.

No browser or phone verification was performed as part of the merge.
