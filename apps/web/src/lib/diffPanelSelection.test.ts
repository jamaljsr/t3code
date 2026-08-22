import { describe, expect, it } from "vite-plus/test";

import { resolveDiffPanelSelectedPath } from "./diffPanelSelection";

const files = ["src/b.ts", "src/a.ts"];

describe("resolveDiffPanelSelectedPath", () => {
  it("uses a requested path when it exists", () => {
    expect(
      resolveDiffPanelSelectedPath({
        paths: files,
        requestedPath: "src/b.ts",
        previousPath: "src/a.ts",
      }),
    ).toBe("src/b.ts");
  });

  it("keeps the previous path across a scope change when it still exists", () => {
    expect(
      resolveDiffPanelSelectedPath({
        paths: files,
        requestedPath: null,
        previousPath: "src/b.ts",
      }),
    ).toBe("src/b.ts");
  });

  it("falls back to the first sorted path", () => {
    expect(
      resolveDiffPanelSelectedPath({
        paths: files,
        requestedPath: "missing.ts",
        previousPath: "gone.ts",
      }),
    ).toBe("src/a.ts");
  });

  it("returns null when there are no files", () => {
    expect(
      resolveDiffPanelSelectedPath({ paths: [], requestedPath: "a.ts", previousPath: "a.ts" }),
    ).toBe(null);
  });
});
