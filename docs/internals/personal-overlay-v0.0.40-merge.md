# Personal overlay merge: v0.0.40

Merged `v0.0.40` (`09e8de9c65`) into `personal` from `91088610bd`, with
`v0.0.39` (`6abdf37a50`) as the merge base.

## Resolutions

- Kept the multi-project sidebar selector and incorporated upstream's spacing,
  timer typography, and settled PR hover fixes.
- Kept the mobile one-file review flow. Incorporated the nullable native-view
  fallback and pull-to-refresh. Git review can still switch files without the
  native view; its fallback displays the selected file's patch. Turn review
  hides the navigator when the native view is unavailable.
- Combined the Git test imports, retaining prefix-free generated branch names
  alongside upstream's remote-config parser.
- The project scanner's symlink exclusion test failed on macOS because the
  candidate resolved through `/private/var` while the configured exclusion used
  `/var`. Compare against both configured and canonical base/worktree paths.

## Compatibility and verification

The personal desktop diff panel, commit filtering, status indicators, and zero
count dashes are unchanged. Review still serves both `diff` and `files`, and
file-attachment opt-ins still cover HTTP, live events, and replay. The Git driver
and these protocol paths have no upstream changes in this release.

The new project-import Git identity is optional. The 1.0.3-era resolved-keybindings
decoder drops unknown rules, so `thread.stop` does not invalidate its config.

Focused review/Git, sidebar, mobile review, legacy stream, attachment, shortcut,
composer, preview, scanner, project-script, and Claude tests passed. Web, mobile,
and server typechecks passed. Targeted lint reported warnings but no errors.
The scanner test was rerun after the canonical-path repair.

No browser or phone verification was performed. The running desktop/server and
live state were not replaced or restarted; phone working-tree/branch confirmation
remains a post-install check.
