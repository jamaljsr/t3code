import type { FileDiffMetadata } from "@pierre/diffs";
import { describe, expect, it } from "vite-plus/test";

import { diffHunkScrollbarMarksForFile } from "./diffHunkScrollbar";

function fileDiff(
  hunks: FileDiffMetadata["hunks"],
  newLineCount: number,
  oldLineCount: number,
): Pick<FileDiffMetadata, "hunks" | "additionLines" | "deletionLines"> {
  return {
    hunks,
    additionLines: Array.from({ length: newLineCount }, () => ""),
    deletionLines: Array.from({ length: oldLineCount }, () => ""),
  };
}

describe("diffHunkScrollbarMarksForFile", () => {
  it("returns no marks when there are no hunks", () => {
    expect(diffHunkScrollbarMarksForFile(fileDiff([], 0, 0))).toEqual([]);
  });

  it("aligns add and delete marks on the same split row of the longer file", () => {
    const oldLines = 579;
    const marks = diffHunkScrollbarMarksForFile(
      fileDiff(
        [
          {
            collapsedBefore: 33,
            additionStart: 34,
            additionCount: 4,
            deletionStart: 34,
            deletionCount: 19,
            additionLines: 1,
            deletionLines: 16,
            hunkContent: [
              { type: "context", lines: 3 },
              { type: "change", deletions: 16, additions: 1 },
            ],
          },
          {
            collapsedBefore: 2,
            additionStart: 40,
            additionCount: 4,
            deletionStart: 54,
            deletionCount: 31,
            additionLines: 1,
            deletionLines: 28,
            hunkContent: [
              { type: "context", lines: 3 },
              { type: "change", deletions: 28, additions: 1 },
            ],
          },
        ] as FileDiffMetadata["hunks"],
        534,
        oldLines,
      ),
    );

    const adds = marks.filter((mark) => mark.kind === "add");
    const deletes = marks.filter((mark) => mark.kind === "delete");
    expect(adds[0]?.top).toBe(deletes[0]?.top);
    expect(adds[0]).toEqual({ top: 36 / oldLines, height: 1 / oldLines, kind: "add" });
    expect(deletes[0]?.height).toBe(16 / oldLines);
    expect(adds[1]?.top).toBe(deletes[1]?.top);
    expect(adds[1]?.top).toBe(57 / oldLines);
  });

  it("does not stretch a late hunk to the end of the bar when the file is much longer", () => {
    const [mark] = diffHunkScrollbarMarksForFile(
      fileDiff(
        [
          {
            collapsedBefore: 345,
            additionStart: 346,
            additionCount: 0,
            deletionStart: 346,
            deletionCount: 5,
            additionLines: 0,
            deletionLines: 5,
            hunkContent: [{ type: "change", deletions: 5, additions: 0 }],
          },
        ] as FileDiffMetadata["hunks"],
        380,
        427,
      ),
    );

    expect(mark).toEqual({ top: 345 / 427, height: 5 / 427, kind: "delete" });
    expect((mark?.top ?? 0) + (mark?.height ?? 0)).toBeLessThan(0.9);
  });

  it("keeps a compact patch on hunk rows when line arrays are only the patch", () => {
    expect(
      diffHunkScrollbarMarksForFile(
        fileDiff(
          [
            {
              collapsedBefore: 189,
              additionStart: 190,
              additionCount: 2,
              deletionStart: 190,
              deletionCount: 1,
              additionLines: 2,
              deletionLines: 1,
              hunkContent: [{ type: "change", deletions: 1, additions: 2 }],
            },
          ] as FileDiffMetadata["hunks"],
          2,
          1,
        ),
      ),
    ).toEqual([
      { top: 0, height: 1, kind: "add" },
      { top: 0, height: 0.5, kind: "delete" },
    ]);
  });
});
