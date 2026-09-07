# Personal overlay merge: v0.0.39

Merged upstream `v0.0.39` into `personal`, keeping the one-file review workflow and multi-project
sidebar selection. The file change-status indicators discussed before this merge are deferred.

## Source refs

- Personal tip before the merge: `9df1265faa`
- Upstream release: `v0.0.39` at `6abdf37a50`
- Merge base: `c0995d2eaf` (`v0.0.38`)

## Conflict resolutions

- Kept `DiffPanel.tsx` as the re-export of `ThreadDiffPanel.tsx`. The personal tree now lives in
  `ThreadDiffFileTree.tsx`; upstream's `DiffFileTree.tsx` serves the PR Code tab. The personal panel
  keeps its resizable tree, file/folder statistics, commit list, hunk navigation, and per-file loading.
- Kept the multi-project `ProjectScopeSelector`, including row-click selection and checkbox toggles.
  Integrated upstream's thread ordering, drag actions, PR state, and machine/project icons around it.
- Kept the in-repo mobile review's one-file selection and manifest-based loading. Updated the new
  prewarming fixtures to include the overlay's review fields.
- Kept prefix-free generated branch names while incorporating upstream's citation-aware prompt
  handling and receipt-based reactor tests.
- Kept the legacy thread-detail event filter while incorporating upstream's bounded stream buffers.
  Command-intent events, including `acceptAlways` approval responses, remain off the legacy stream.
- Kept review manifests, commit metadata, per-file RPCs, and the legacy unified patch response.
  Applied upstream's explicit `a/` and `b/` Git patch prefixes to both legacy and per-file paths.
- Kept the personal Codex protocol source ref and optional thread `projectId`, added upstream's
  error compatibility and async-question fields, and regenerated the protocol files. Applied the
  async-question transform to the generator's aggregate input as well as registered schemas so
  generation retains those fields. Older question requests may omit `isBlocking`; both request
  schema forms accept the older shape, with a regression test.
- Took upstream's rewritten source-control docs and glossary, then restored the personal review
  behavior and corrected the glossary to describe both the manifest and legacy patch response.

## Repairs after the textual merge

The personal diff panel now uses the persisted `diffLayout` setting and supplies file content
versions required by the updated viewer. Its hunk suffix callback remains available through the
shared annotation wrapper. The project selector passes project names and icon overrides to the
updated favicon component.

## Compatibility audit

`review.getDiffPreview` still sends the required `diff` field alongside `files`. The legacy patch
keeps its 120 KB cap and truncation marker. The manifest determines `diffHash`, and `truncated`
accounts for both the manifest and patch. `review.getDiffFilePatch` remains additive.

The older-client thread-event filter and activity projection overload remain in place. The new
usage-source config events require an explicit subscription opt-in. Reviewed the auto-merged
contract additions and Git driver alongside these overlay paths.

Desktop/server use this checkout; the installed phone app has its own release lifecycle. No
server was started against live state, no desktop installation was replaced, and no phone or
browser verification was performed. These checks establish the tested compatibility paths, not
an exhaustive certification of every RPC used by the installed mobile binary.

## Verification

- Review contracts and Git driver: 84 tests passed.
- Client review, tree, hunk, and project-scope checks: 109 tests passed across 15 files.
- Backend/protocol checks: 265 tests across 9 files. One Codex question test initially timed out;
  after fixing the optional blocking flag, the Codex adapter/schema/protocol rerun passed all
  74 tests, including the added regression.
- Server integration: 181 tests passed, including the legacy approval-event stream check.
- Extended Git prefix regression: passed for both legacy preview and per-file patches.
- Web, mobile, and server typechecks passed. Targeted lint completed with existing warnings;
  merge-introduced unused imports were removed.
- Conflict-marker and source whitespace checks passed. Upstream dependency patch files retain
  their patch-context whitespace, which Git reports in the full staged whitespace check.

No repository-wide test or typecheck command was run. Browser, desktop runtime, and installed-phone
verification remain unperformed.
