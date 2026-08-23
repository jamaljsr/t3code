# Diff pane hunk scrollbar

Widen the native scrollbar on the web diff pane and paint red/green hunk ticks on top of it, so a reviewer can see where changes sit in the file and jump with the existing native click-to-jump.

## Problem

The one-file review pane opens on the first hunk. For a long file the rest of the changes are off-screen. Prev/next hunk in the header steps through them, but there is no VS Code-style overview of _where_ the hunks are. The app scrollbar is 6px and unmarked.

## Goals

- Show hunk locations on a **thicker native scrollbar** in the web DiffPanel.
- Ticks use theme addition/deletion colors.
- Native click-anywhere, drag, and thumb stay. Overlay marks do not capture pointer events.
- Same rail for unified and split, turns and git.
- Least code: no custom thumb, no minimap, no scroll listener.

## Non-goals

- Mobile. Native review renderer is a different surface; out of scope.
- Replacing the native scrollbar or drawing a custom thumb.
- A code minimap.
- Click handlers on ticks. The native track already jumps.
- Changing `DiffHunkNav` / `hunkScrollTarget` / first-hunk reveal.
- App-wide scrollbar thickness.
- A second rail in split view.

## Surfaces

- **Web** `DiffPanel` in `inline`, `sheet`, `sidebar`, `embedded`.
- **Desktop** wraps web. No extra IPC.
- **Not mobile.**

Entry points that already open the pane (chat changed-files, command palette, keybindings) get this for free. No new settings, palette item, or keybinding.

## Decisions

| Topic        | Choice                                                                             |
| ------------ | ---------------------------------------------------------------------------------- |
| Form         | Widen native scrollbar; paint ticks on top                                         |
| Surfaces     | Web + desktop only                                                                 |
| Click        | Overlay is `pointer-events: none`; native bar handles jump/drag                    |
| Thickness    | `--app-scrollbar-width: 12px` on `.diff-render-surface` only. App chrome stays 6px |
| Colors       | `--diffs-addition-base` / `--diffs-deletion-base`                                  |
| Split        | One rail                                                                           |
| Turns vs git | Same helper from `fileDiff.hunks`                                                  |
| Empty hunks  | No overlay. Thick bar still shows                                                  |
| One hunk     | Ticks still paint. Header prev/next stays hidden (`hunkCount > 1`)                 |

## Architecture

Scope stays inside the existing `.diff-render-surface` scroller in `DiffPanel` (the `overflow-auto` pane). Two additions:

1. **Thicker track** — set `--app-scrollbar-width` to `12px` on that surface. Thumb, hover, and track styling keep using `--app-scrollbar-thumb` / `--app-scrollbar-thumb-hover`. Firefox on the same surface uses `scrollbar-width: auto` so the gutter is wide enough for ticks.
2. **Hunk ticks** — a sibling overlay, `position: absolute` on the right edge, full pane height, same 12px width. It does not scroll with the file. `pointer-events: none` on the overlay and every tick.

A pure helper next to `hunkScrollTarget` in `apps/web/src/lib/diffFileFocus.ts` maps `fileDiff.hunks` plus a line count to `{ top, height, kind }` as 0–1 fractions. The overlay renders those. No `scroll` listener, no `ResizeObserver`, no DOM measurement of hunk nodes.

`DiffHunkNav` and `codeViewRef.scrollTo` stay as they are.

## Overlay

- Pinned to the visible gutter (not the scrollHeight). Ticks are placed as percentages of file line range, like VS Code’s overview ruler — not as percentages of rendered pixel height including the file header.
- Short rounded rects, inset ~1px from the track edges.
- Add-only: `--diffs-addition-base`. Delete-only: `--diffs-deletion-base`. Both: two marks at the same `top`/`height` (deletion then addition). No split-half gradient.
- Thumb draws in the native layer on top of the marks. No extra thumb chrome.
- Static paint. No hover grow, no scroll-linked animation.

## Hunk mapping

Input: `fileDiff.hunks` (`additionStart`, `additionLines`, `deletionStart`, `deletionLines`) and `totalLines`.

`totalLines` is the new-side line count after hydration when the file has one; otherwise `max(last addition end, last deletion end)` across hunks. Deleted-file fallback is the old-side span from the same max.

For each hunk:

- start = `additionStart` if `additionLines > 0`, else `deletionStart` (same rule as `hunkScrollTarget`)
- span = `max(additionLines, deletionLines)`
- `top = (start - 1) / totalLines`
- `height = span / totalLines`
- kind = add / delete / both

The helper returns raw 0–1 fractions. The overlay applies `min-height: 3px` in CSS so one-line hunks stay visible without the helper knowing pane height.

Skip the whole list when `totalLines <= 0` or `hunks` is empty. Skip a hunk whose start is past `totalLines`. Overlapping ticks paint on top of each other.

Same helper for turns (hunks-only) and git (hydrated). Rematerialize when hydration updates the line count or hunk list. No placeholder “full file” tick while waiting.

## Empty and edge cases

| Case                                 | Behavior                                                           |
| ------------------------------------ | ------------------------------------------------------------------ |
| Binary, rename-only, empty hunk list | No overlay. 12px scrollbar remains                                 |
| One hunk                             | Ticks paint. Header nav hidden                                     |
| Partial / hydrating                  | Paint current hunks; update when hydration finishes                |
| Deleted file                         | Delete-only ticks from old-side span                               |
| New file                             | Add-only ticks                                                     |
| Collapsed / tree-only / no code pane | Overlay is on the code pane, so it is gone                         |
| macOS overlay scrollbars             | Ticks stay on the right edge, still non-interactive. No fake track |
| Split view                           | One rail                                                           |

## Testing

Unit tests on the mapping helper only. No visual snapshot. No browser pass unless requested later.

- Add-only, delete-only, and both-sides hunks produce the right `top` / `height` / `kind`.
- `totalLines <= 0` or empty hunks → `[]`.
- Start past the end is skipped. Fractions are not pixel-clamped.
- New-file and deleted-file inputs match the table above.
- Existing `hunkScrollTarget` / reveal tests stay untouched.

Focused `vp test run` on the touched test file. No repo-wide check.

## Files (expected)

- Modify: `apps/web/src/lib/diffFileFocus.ts` and `diffFileFocus.test.ts` (mapping helper)
- Modify: `apps/web/src/components/DiffPanel.tsx` (overlay mount)
- Modify: `apps/web/src/index.css` (`.diff-render-surface` scrollbar width; overlay classes if they live in CSS)
- Optional small overlay component next to the panel if `DiffPanel` would get noisier
- Docs: one user-facing sentence in `docs/user/` if the review pane is already documented; no RPC / internals change
