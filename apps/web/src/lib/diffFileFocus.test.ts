import type { FileDiffMetadata } from "@pierre/diffs";
import { describe, expect, it } from "vite-plus/test";

import {
  DIFF_FILE_TREE_DIFFS_MIN_WIDTH,
  DIFF_FILE_TREE_MIN_WIDTH,
  canExpandUnchanged,
  clampDiffFileTreeMaxWidth,
  collapseAllExcept,
  didRevealRequestChange,
  firstHunkScrollTarget,
  revealFocusedDiffAfterHydration,
  shouldExpandUnchanged,
  toTurnDiffTreeFiles,
  waitForFileDiffHydration,
} from "./diffFileFocus";

function fileWithHunks(
  hunks: ReadonlyArray<{
    additionStart: number;
    additionLines: number;
    deletionStart: number;
    deletionLines: number;
  }>,
): FileDiffMetadata {
  return {
    name: "src/app.ts",
    type: "change",
    hunks,
    isPartial: true,
  } as unknown as FileDiffMetadata;
}

describe("collapseAllExcept", () => {
  const keys = ["a", "b", "c"];

  it("collapses every file except the target", () => {
    expect(collapseAllExcept(keys, "b")).toEqual(new Set(["a", "c"]));
  });

  it("collapses nothing when the patch has one file", () => {
    expect(collapseAllExcept(["a"], "a")).toEqual(new Set());
  });

  it("collapses every file when the target is unknown", () => {
    expect(collapseAllExcept(keys, "missing")).toEqual(new Set(keys));
  });
});

describe("firstHunkScrollTarget", () => {
  it("scrolls to the first added line of the first hunk", () => {
    expect(
      firstHunkScrollTarget(
        fileWithHunks([
          { additionStart: 40, additionLines: 3, deletionStart: 38, deletionLines: 1 },
        ]),
        "file-a",
      ),
    ).toEqual({
      type: "line",
      id: "file-a",
      lineNumber: 40,
      side: "additions",
      align: "start",
    });
  });

  it("scrolls to the first deleted line when the hunk only deletes", () => {
    expect(
      firstHunkScrollTarget(
        fileWithHunks([
          { additionStart: 12, additionLines: 0, deletionStart: 10, deletionLines: 4 },
        ]),
        "file-a",
      ),
    ).toEqual({
      type: "line",
      id: "file-a",
      lineNumber: 10,
      side: "deletions",
      align: "start",
    });
  });

  it("falls back to the file header when there are no hunks", () => {
    expect(firstHunkScrollTarget(fileWithHunks([]), "file-a")).toEqual({
      type: "item",
      id: "file-a",
      align: "start",
    });
  });
});

describe("canExpandUnchanged", () => {
  it("is true only for git scopes with a contents loader", () => {
    expect(canExpandUnchanged({ hasGitLoader: true, selectedTurnId: null })).toBe(true);
    expect(canExpandUnchanged({ hasGitLoader: false, selectedTurnId: null })).toBe(false);
    expect(canExpandUnchanged({ hasGitLoader: true, selectedTurnId: "turn-1" })).toBe(false);
  });
});

describe("shouldExpandUnchanged", () => {
  const keys = ["a", "b", "c"];

  it("is true when a git-scope file is focused and every other file is collapsed", () => {
    expect(
      shouldExpandUnchanged({
        canExpand: true,
        focusedFileKey: "b",
        collapsedFileKeys: new Set(["a", "c"]),
        fileKeys: keys,
      }),
    ).toBe(true);
  });

  it("is false when siblings are still expanded", () => {
    expect(
      shouldExpandUnchanged({
        canExpand: true,
        focusedFileKey: "b",
        collapsedFileKeys: new Set(["a"]),
        fileKeys: keys,
      }),
    ).toBe(false);
  });

  it("is false when the focused file is collapsed", () => {
    expect(
      shouldExpandUnchanged({
        canExpand: true,
        focusedFileKey: "b",
        collapsedFileKeys: new Set(keys),
        fileKeys: keys,
      }),
    ).toBe(false);
  });

  it("is false without a focused file or git loader", () => {
    expect(
      shouldExpandUnchanged({
        canExpand: false,
        focusedFileKey: "b",
        collapsedFileKeys: new Set(["a", "c"]),
        fileKeys: keys,
      }),
    ).toBe(false);
    expect(
      shouldExpandUnchanged({
        canExpand: true,
        focusedFileKey: null,
        collapsedFileKeys: new Set(keys),
        fileKeys: keys,
      }),
    ).toBe(false);
  });
});

describe("waitForFileDiffHydration", () => {
  it("resolves immediately when expandUnchanged is off", async () => {
    const fileDiff = fileWithHunks([]);
    const scheduled: Array<() => void> = [];

    await waitForFileDiffHydration(fileDiff, {
      shouldHydrate: false,
      schedule: (callback) => scheduled.push(callback),
    });

    expect(scheduled).toEqual([]);
  });

  it("resolves immediately when the file is already hydrated", async () => {
    const fileDiff = fileWithHunks([]);
    fileDiff.isPartial = false;
    const scheduled: Array<() => void> = [];

    await waitForFileDiffHydration(fileDiff, {
      shouldHydrate: true,
      schedule: (callback) => scheduled.push(callback),
    });

    expect(scheduled).toEqual([]);
  });

  it("waits until Pierre marks the file hydrated", async () => {
    const fileDiff = fileWithHunks([]);
    const scheduled: Array<() => void> = [];
    const pending = waitForFileDiffHydration(fileDiff, {
      shouldHydrate: true,
      schedule: (callback) => scheduled.push(callback),
    });

    expect(scheduled).toHaveLength(1);
    fileDiff.isPartial = false;
    scheduled[0]?.();
    await pending;
  });

  it("gives up after the timeout so a stuck patch still scrolls", async () => {
    const fileDiff = fileWithHunks([]);
    let now = 0;
    const scheduled: Array<() => void> = [];
    const pending = waitForFileDiffHydration(fileDiff, {
      shouldHydrate: true,
      schedule: (callback) => scheduled.push(callback),
      now: () => now,
      timeoutMs: 20,
    });

    now = 20;
    scheduled[0]?.();
    await pending;
  });
});

describe("revealFocusedDiffAfterHydration", () => {
  it("scrolls immediately when the file is already hydrated", async () => {
    const fileDiff = fileWithHunks([]);
    fileDiff.isPartial = false;
    const scrolls: number[] = [];
    const layouts: number[] = [];

    await revealFocusedDiffAfterHydration({
      fileDiff,
      needsHydration: false,
      isCancelled: () => false,
      scroll: () => scrolls.push(scrolls.length),
      afterLayout: async () => {
        layouts.push(layouts.length);
      },
    });

    expect(scrolls).toEqual([0]);
    expect(layouts).toEqual([]);
  });

  it("waits for layout after Pierre hydrates before the first scroll", async () => {
    const fileDiff = fileWithHunks([]);
    const scheduled: Array<() => void> = [];
    const events: string[] = [];
    const pending = revealFocusedDiffAfterHydration({
      fileDiff,
      needsHydration: true,
      isCancelled: () => false,
      scroll: () => events.push("scroll"),
      wait: (diff, options) =>
        waitForFileDiffHydration(diff, {
          ...options,
          schedule: (callback) => scheduled.push(callback),
        }),
      afterLayout: async () => {
        events.push("layout");
      },
    });

    expect(events).toEqual([]);
    fileDiff.isPartial = false;
    scheduled[0]?.();
    await pending;
    expect(events).toEqual(["layout", "scroll"]);
  });

  it("scrolls again after a late hydration that missed the first wait", async () => {
    const fileDiff = fileWithHunks([]);
    const events: string[] = [];
    const waitResolvers: Array<() => void> = [];
    const pending = revealFocusedDiffAfterHydration({
      fileDiff,
      needsHydration: true,
      isCancelled: () => false,
      scroll: () => events.push("scroll"),
      wait: () =>
        new Promise<void>((resolve) => {
          waitResolvers.push(resolve);
        }),
      afterLayout: async () => {
        events.push("layout");
      },
    });

    expect(waitResolvers).toHaveLength(1);
    waitResolvers[0]?.();
    for (let i = 0; i < 20 && waitResolvers.length < 2; i++) {
      await Promise.resolve();
    }
    expect(events).toEqual(["layout", "scroll"]);
    expect(waitResolvers).toHaveLength(2);
    fileDiff.isPartial = false;
    waitResolvers[1]?.();
    await pending;
    expect(events).toEqual(["layout", "scroll", "layout", "scroll"]);
  });
});

describe("didRevealRequestChange", () => {
  it("detects a new chat reveal request", () => {
    expect(didRevealRequestChange(3, 4)).toBe(true);
    expect(didRevealRequestChange(4, 4)).toBe(false);
  });
});

describe("clampDiffFileTreeMaxWidth", () => {
  it("caps at half the panel and leaves 240px for diffs", () => {
    expect(clampDiffFileTreeMaxWidth(800)).toBe(400);
    expect(clampDiffFileTreeMaxWidth(600)).toBe(300);
  });

  it("never goes below the tree minimum, even on a 360px inline panel", () => {
    expect(clampDiffFileTreeMaxWidth(360)).toBe(DIFF_FILE_TREE_MIN_WIDTH);
    expect(360 - DIFF_FILE_TREE_MIN_WIDTH).toBeLessThan(DIFF_FILE_TREE_DIFFS_MIN_WIDTH);
  });
});

describe("toTurnDiffTreeFiles", () => {
  it("maps renderable Pierre files onto tree entries using the new path and hunk stats", () => {
    const fileDiff = fileWithHunks([
      { additionStart: 1, additionLines: 4, deletionStart: 1, deletionLines: 2 },
    ]);
    expect(toTurnDiffTreeFiles([{ fileDiff, filePath: "src/renamed.ts" }])).toEqual([
      { path: "src/renamed.ts", kind: "change", additions: 4, deletions: 2 },
    ]);
  });
});
