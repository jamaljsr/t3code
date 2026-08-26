# Personal overlay merge: v0.0.34

This note records how upstream `v0.0.34` was folded into the personal overlay. It exists so the
next upstream fold can preserve the same desktop behavior and App Store mobile compatibility
without reconstructing this merge from commit history.

## Source refs

- Overlay tip before the merge: `17f3f5e53`, `fix(review): dual-serve git diffs for App Store 1.0.3 (#5)`
- Upstream tag: `v0.0.34` at `badae6a5c`
- Merge base: `3b72d17cb`
- Playground branch: `playground-fold-upstream-v0034`
- Merge commit: `7caa1e633`

The tag was merged into the overlay. The overlay was not rebased, and the playground result was
not merged into `personal` as part of this work.

## Compatibility target

Desktop and server run from the personal checkout. Daily mobile is the App Store T3 Code 1.0.3
binary, not `apps/mobile` from the same commit. The store client decodes responses with its own
schemas, so keeping a field in the TypeScript source is not enough. The server must continue to
send the required 1.0.3 wire shape.

The review preview contract remains dual-served:

- `diff` is required and contains the unified patch used by App Store 1.0.3.
- `files` is required and drives the desktop one-file panel and per-file RPCs.
- A patch is capped at 120 KB and uses the existing `[truncated]` marker.
- `truncated` is true when either the listing or patch is truncated.
- `diffHash` hashes the manifest. It does not hash the patch.
- Git changes must not be represented as `diff: ""`, because 1.0.3 renders that as no changes.

## Conflict resolutions

| File                                              | Resolution                                                                                                                   |
| ------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `apps/web/src/components/DiffPanel.tsx`           | Kept the overlay file. It remains a re-export of `ThreadDiffPanel.tsx`; the upstream stacked-hunk body was not restored.     |
| `apps/web/src/index.css`                          | Mixed. Kept overlay file-tree, one-file panel, hunk, scrollbar, and diff-surface styles while taking unrelated upstream CSS. |
| `docs/user/source-control.md`                     | Mixed. Kept the overlay review behavior and dual-serve truth while taking compatible upstream PR-edit documentation.         |
| `apps/mobile/src/features/review/ReviewSheet.tsx` | Mixed. Kept overlay one-file navigation and per-file loading while taking additive upstream theme and showcase changes.      |

No conflict was resolved by taking the complete upstream file.

## Hand-ports and semantic repairs

Two upstream `DiffPanel` fixes still applied to the overlay panel and were ported by hand:

- Nested project paths are passed to the primary file-open action (`#6174`).
- Native title attributes were replaced with the shared tooltip component (`#7209`).

The stacked-file viewer and viewer toggle were intentionally left out.

The clean auto-merge also needed these repairs:

- The combined working-tree patch is capped after tracked and untracked patches are joined. Branch
  patches use the same cap and truncation marker.
- Two in-repo mobile test fixtures received `diff: ""` only because they construct the contract
  directly. This does not change the App Store response path.
- Overlay-only code-view CSS now travels through the shared styled-view extension prop. The shared
  viewer still owns its centralized layout values.
- `apps/web/src/lib/diffCollapse.ts` and its test were restored because the new upstream pull-request
  code tab imports them. The overlay thread panel still does not use the upstream stacked viewer.

Overlay-only panels, file trees, commit lists, diff loading helpers, manifest code, rules, and
personal-overlay specifications all survived the merge.

## Approval stream compatibility

Upstream added `acceptAlways` to `ProviderApprovalDecision`. At first glance this looked like a
1.0.3 decoder break because `thread.approval-response-requested` stores that decision. The event is
internal command intent, though, and `subscribeThread` has never sent it. Both live delivery and
catch-up replay use the same detail-event allowlist. Resolved approval decisions are not present in
the thread snapshot either.

The contract now encodes that runtime invariant directly. `OrchestrationThreadStreamItem` accepts
only the detail-event variants the thread client can consume:

- `thread.message-sent`
- `thread.deleted` (legacy-compatible; current deletion delivery uses the shell stream)
- `thread.proposed-plan-upserted`
- `thread.activity-appended`
- `thread.turn-diff-completed`
- `thread.reverted`
- `thread.session-set`

This prevents a future server change from putting command-intent events on the wire without first
changing the stream contract. A WebSocket regression test publishes an `acceptAlways` response,
then a compatible message. The 1.0.3-shaped decoder receives the message and remains connected;
the approval response never reaches it.

## Other v0.0.34 protocol changes

The audited RPCs used by App Store 1.0.3 remain additive. Two changes deserve a note:

- MCP elicitation uses activity payloads that are unknown-shaped on the old wire, so it does not
  break decoding. App Store 1.0.3 cannot render or answer the prompt, so a newer desktop client must
  answer it if the provider waits for a response.
- `PullRequestReviewCommentDraft` changed from required `line` and `side` fields to required
  `position`. That is not additive for callers of the review-submission RPC, but App Store 1.0.3
  does not use that surface.

## Verification

The fold used focused checks rather than the repository-wide suite:

```text
vp test run packages/contracts/src/review.test.ts
vp test run packages/contracts/src/orchestration.test.ts
vp test run apps/server/src/vcs/GitVcsDriverCore.test.ts
vp test run apps/server/src/server.test.ts -t "keeps acceptAlways approval responses off the legacy thread stream"
```

Contracts, server, web, and mobile scoped typechecks also passed. The Homebrew Git binary on the
merge machine died with signal 9 when tests invoked `git submodule`; the VCS test passed with
`/usr/bin/git` first in `PATH`.

No server or browser was started for the fold. The playground worktree used its own `.t3` state and
never pointed at `~/.t3`.

## Rules for the next fold

- Merge a release tag into the overlay. Do not rebase the overlay onto upstream.
- Keep ours on the `DiffPanel.tsx` re-export and hand-port applicable upstream fixes.
- Read `GitVcsDriverCore.ts`, review contracts, RPC/IPC, authorization, and WebSocket code even when
  Git reports a clean auto-merge.
- Treat the App Store binary as the protocol floor. Test the old decoder shape, not only the current
  shared TypeScript types.
- Keep `diff` and `files` required until the App Store floor changes.
- Use a playground worktree and isolated `.t3` state before promoting an upstream fold to `personal`.
