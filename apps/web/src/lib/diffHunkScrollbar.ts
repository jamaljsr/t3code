import type { FileDiffMetadata } from "@pierre/diffs";

export type DiffHunkScrollbarKind = "add" | "delete";

export type DiffHunkScrollbarMark = {
  readonly top: number;
  readonly height: number;
  readonly kind: DiffHunkScrollbarKind;
};

type HunkSegment =
  | { readonly type: "context"; readonly lines: number }
  | { readonly type: "change"; readonly additions: number; readonly deletions: number };

function hunkSegments(hunk: FileDiffMetadata["hunks"][number]): ReadonlyArray<HunkSegment> {
  if (hunk.hunkContent != null && hunk.hunkContent.length > 0) return hunk.hunkContent;
  return [{ type: "change", additions: hunk.additionLines, deletions: hunk.deletionLines }];
}

function clampMark(top: number, height: number): { top: number; height: number } | null {
  if (!Number.isFinite(top) || !Number.isFinite(height) || height <= 0 || top >= 1) {
    return null;
  }
  const clampedTop = Math.max(0, top);
  const clampedHeight = Math.min(height, 1 - clampedTop);
  if (clampedHeight <= 0) return null;
  return { top: clampedTop, height: clampedHeight };
}

/** Split-view row positions as fractions of the taller side. */
export function diffHunkScrollbarMarksForFile(
  fileDiff: Pick<FileDiffMetadata, "hunks" | "additionLines" | "deletionLines">,
): ReadonlyArray<DiffHunkScrollbarMark> {
  let lastNewLine = 0;
  let lastOldLine = 0;
  for (const hunk of fileDiff.hunks) {
    if (hunk.additionCount > 0) {
      lastNewLine = Math.max(lastNewLine, hunk.additionStart + hunk.additionCount - 1);
    }
    if (hunk.deletionCount > 0) {
      lastOldLine = Math.max(lastOldLine, hunk.deletionStart + hunk.deletionCount - 1);
    }
  }
  const includeUnchanged =
    (fileDiff.additionLines.length >= lastNewLine && lastNewLine > 0) ||
    (fileDiff.deletionLines.length >= lastOldLine && lastOldLine > 0);

  const raw: Array<{ row: number; count: number; kind: DiffHunkScrollbarKind }> = [];
  let row = 0;
  for (const hunk of fileDiff.hunks) {
    if (includeUnchanged) row += Math.max(hunk.collapsedBefore, 0);
    for (const segment of hunkSegments(hunk)) {
      if (segment.type === "context") {
        row += segment.lines;
        continue;
      }
      if (segment.additions > 0) raw.push({ row, count: segment.additions, kind: "add" });
      if (segment.deletions > 0) raw.push({ row, count: segment.deletions, kind: "delete" });
      row += Math.max(segment.additions, segment.deletions);
    }
  }

  const totalRows = Math.max(row, fileDiff.additionLines.length, fileDiff.deletionLines.length);
  if (totalRows <= 0) return [];

  const marks: DiffHunkScrollbarMark[] = [];
  for (const mark of raw) {
    const clamped = clampMark(mark.row / totalRows, mark.count / totalRows);
    if (clamped) marks.push({ ...clamped, kind: mark.kind });
  }
  return marks;
}
