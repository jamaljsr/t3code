# Personal overlay merge: v0.0.44

Upstream source: `v0.0.44` (`451afcb22d`). Personal source: `d3b55272de`.
Merge base: `6530de0339` (`v0.0.43-nightly.20260926.2282`).

## Personal behavior

Git combined all overlapping files without conflicts. The personal diff panel,
file tree, commit filters, hunk navigation, file-switching cache, project selector,
and timestamp formatting are unchanged. The sidebar keeps the personal header and
multi-project scope alongside upstream's accessibility and sorting changes.

The review reader keeps the personal implementation. Its upstream changes affect
Git tracing and disable automatic maintenance during background fetches. Review
sources keep `diff`, numeric `files` statistics, and the personal `manifest`.
Commit-scoped and per-file RPCs remain registered and authorized.

Attachment opt-ins remain independent of reasoning-message opt-ins. HTTP snapshots,
socket snapshots, live events, and replay omit non-image attachments for clients
that do not opt in. Persisted attachments remain intact.

No manual conflict resolutions or semantic repairs were needed. Every personal-only
file is byte-identical to the personal source.

## Verification

- 877 focused tests passed across review contracts and Git operations, review services,
  thread synchronization, attachment and reasoning compatibility, orchestration,
  Codex protocol, mobile review logic, personal diff and sidebar behavior, queued
  messages, and shortcut modifiers.
- Server, web, desktop, mobile, contracts, client-runtime, shared, and Codex protocol
  typechecks passed.
- Targeted lint on automatically combined runtime files passed with warnings and no errors.
- Browser verification passed through `agent-browser` at desktop (1440 × 900)
  and phone (390 × 844) widths against an isolated database snapshot with 14
  projects and 201 threads. Checked single-project and multi-project selection,
  the full thread list, a one-thread project, and empty search results at both widths.
- The personal diff panel rendered the large turn and working-tree diffs. Commit
  filtering narrowed the file tree, older commits displayed dates, switching files
  loaded their patches, and Uncommitted returned to the working-tree scope. The
  file tree could be hidden at phone width.
- Full chat width expanded the desktop composer. Usage metric shortcuts and Escape
  navigation worked at phone width. No browser page errors were reported.
- Installed App Store client behavior, a new provider sign-in, and live queued
  provider turns were not exercised. Contract and queue tests cover those paths;
  they do not replace device or live-provider verification.

The isolated dev runner and browser were stopped after verification. Evidence
remains in the ignored `.plans/merge-v0044-browser` directory.

The stable release is the merge target. Changes from later nightlies are excluded.
