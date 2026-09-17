# Personal overlay merge: v0.0.42

Merged `v0.0.42` (`719a76ca1d`) into `personal` from `bd2afaf8d9`, with
`v0.0.40` (`09e8de9c65`) as the merge base.

## Resolutions

- Kept the one-file desktop diff panel, commit selection, file tree, hunk
  scrollbar, status markers left of the counts, and muted zero-count dashes.
  The counts, status markers, and scrollbar now follow upstream's diff palette.
  Upstream's separate PR file tree and its tests remain in place.
- Kept the multi-project sidebar selector and adapted its favicons to the new
  project prop. Retained upstream's thread-row, context-preview, and file-drop
  changes. Generated worktree branches still omit the upstream prefix.
- Carried upstream's temporary-index rename detection through the personal
  manifest and per-file patch endpoint. An unstaged rename with edits now has
  one manifest entry and opens as one renamed-file patch. Neither preview nor
  per-file reads modify the repository's index, including split indexes.
  Untracked files also get line counts when the temporary index is available.
- Retained the narrow thread-detail event union. Adapted upstream sync tests to
  advance state with message events, since metadata travels on the shell stream.
- Fixed Effect inference errors exposed by the dependency update in host-power
  notifications, native process-table responses, and Chromium cookie key
  selection. Named the update harness's feed URL return type for declaration
  checking. Fixed an indexed-access error in the personal mobile file selector.

## Compatibility and verification

Review still returns both the capped legacy `diff` and the personal `files`
manifest. Commit metadata and per-file RPCs remain available. File-attachment
opt-ins still cover HTTP reads, socket snapshots, live events, and replay.

New context, screenshot-source, project-setting, and PR fields are additive.
Upstream still emits the derived single-PR field for older clients. The older
app will not gain the new context-chip or multi-PR UI just by updating the server.

Default server settings and a desktop environment descriptor decode with the
1.0.3-era schemas from `85389b9883`, using their Effect beta.103 runtime. All 75
messages in the previously affected thread decode after outgoing attachment
filtering. Negative controls still reject raw file attachments and object-shaped
custom models in the legacy provider settings field; these were already
unsupported. This checks the source-era schemas, not the phone's exact OTA bundle.

Focused Git/review, sidebar, file-tree, mobile review, provider-reactor, power,
telemetry, cookie, sync, pagination, attachment-compatibility, and legacy-stream
tests passed. Web, desktop, server, mobile, and client-runtime typechecks passed.
Targeted lint reported warnings but no errors. Upstream's vendored references
were included with the release merge; Effect's reference is rc.112.

No browser or phone verification was performed. The running desktop/server and
live state were not replaced or restarted. Phone working-tree and branch review
remain post-install checks.
