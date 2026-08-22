import { describe, expect, it } from "vite-plus/test";

import {
  getDefaultReviewExpandedFileIds,
  getValidExplicitReviewFileIds,
  getValidReviewFileIds,
  removeReviewFileId,
  selectReviewFileId,
  toggleReviewFileId,
} from "./reviewFileVisibility";
import type { ReviewRenderableFile } from "./reviewModel";

function makeFile(id: string): ReviewRenderableFile {
  return {
    id,
    cacheKey: id,
    path: id,
    previousPath: null,
    changeType: "change",
    additions: 0,
    deletions: 0,
    languageHint: null,
    additionLines: [],
    deletionLines: [],
    rows: [],
  };
}

describe("review file visibility", () => {
  const files = [makeFile("a.ts"), makeFile("b.ts")];

  it("defaults the selected file to the first renderable file", () => {
    expect(getDefaultReviewExpandedFileIds(files)).toEqual(["a.ts"]);
    expect(getValidReviewFileIds(files, undefined)).toEqual(["a.ts"]);
  });

  it("filters stale cached file ids and falls back to the first file", () => {
    expect(getValidReviewFileIds(files, ["missing.ts", "b.ts"])).toEqual(["b.ts"]);
    expect(getValidReviewFileIds(files, ["missing.ts"])).toEqual(["a.ts"]);
    expect(getValidExplicitReviewFileIds(files, undefined)).toEqual([]);
    expect(getValidExplicitReviewFileIds(files, ["a.ts", "missing.ts"])).toEqual(["a.ts"]);
  });

  it("selects one file at a time and still toggles viewed ids", () => {
    const original = ["a.ts"];

    expect(selectReviewFileId("b.ts")).toEqual(["b.ts"]);
    expect(toggleReviewFileId(original, "b.ts")).toEqual(["a.ts", "b.ts"]);
    expect(toggleReviewFileId(original, "a.ts")).toEqual([]);
    expect(removeReviewFileId(original, "a.ts")).toEqual([]);
    expect(original).toEqual(["a.ts"]);
  });

  it("does not treat marking a file viewed as changing the selected file", () => {
    expect(selectReviewFileId("b.ts")).toEqual(["b.ts"]);
    expect(getValidReviewFileIds(files, ["b.ts"])).toEqual(["b.ts"]);
    expect(getValidExplicitReviewFileIds(files, ["b.ts"])).toEqual(["b.ts"]);
  });
});
