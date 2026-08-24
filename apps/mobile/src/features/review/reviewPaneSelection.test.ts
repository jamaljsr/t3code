import { describe, expect, it } from "vite-plus/test";

import { resolveSelectedReviewFileId } from "./reviewPaneSelection";

describe("resolveSelectedReviewFileId", () => {
  it("keeps a visible file selected within the active section", () => {
    expect(
      resolveSelectedReviewFileId({
        selection: { sectionId: "worktree", fileId: "second" },
        sectionId: "worktree",
        availableFileIds: ["first", "second"],
      }),
    ).toBe("second");
  });

  it("falls back to the first file when the review section changes", () => {
    expect(
      resolveSelectedReviewFileId({
        selection: { sectionId: "turn-1", fileId: "first" },
        sectionId: "turn-2",
        availableFileIds: ["first"],
      }),
    ).toBe("first");
  });

  it("falls back to the first file when the previous id is missing", () => {
    expect(
      resolveSelectedReviewFileId({
        selection: { sectionId: "worktree", fileId: "removed" },
        sectionId: "worktree",
        availableFileIds: ["first", "second"],
      }),
    ).toBe("first");
  });
});
