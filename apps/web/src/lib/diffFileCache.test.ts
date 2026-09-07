import { describe, expect, it } from "vite-plus/test";
import { createDiffFileCache, diffFileCacheKey } from "./diffFileCache";

const contents = { diff: "", oldContents: "before", newContents: "after" };
const input = {
  environmentId: "env",
  cwd: "/repo",
  sourceId: "working-tree",
  baseRef: "HEAD",
  headRef: null,
  diffHash: "same-stats",
  oldPath: "file.ts",
  newPath: "file.ts",
  ignoreWhitespace: false,
  commitOid: null,
  previewVersion: 1,
  mutationId: null,
};

describe("diff file cache", () => {
  it("reuses loaded contents and parsed metadata when returning to a file", () => {
    const cache = createDiffFileCache();
    const first = cache.set("a", {
      ...contents,
      diff: "diff --git a/a.ts b/a.ts\n--- a/a.ts\n+++ b/a.ts\n@@ -1 +1 @@\n-before\n+after\n",
    });
    cache.set("b", contents);
    expect(cache.get("a")).toBe(first);
    expect(first.renderablePatch?.kind).toBe("files");
  });

  it("evicts the least recently used file when the entry limit is reached", () => {
    const cache = createDiffFileCache(2);
    const first = cache.set("a", contents);
    cache.set("b", contents);
    expect(cache.get("a")).toBe(first);
    cache.set("c", contents);
    expect(cache.get("b")).toBeUndefined();
    expect(cache.get("a")).toBe(first);
  });

  it("bounds retained text and does not retain oversized files", () => {
    const cache = createDiffFileCache(8, 44);
    cache.set("a", contents);
    cache.set("b", contents);
    cache.set("c", contents);
    expect(cache.get("a")).toBeUndefined();
    const huge = cache.set("huge", { ...contents, newContents: "x".repeat(100) });
    expect(huge.newContents).toHaveLength(100);
    expect(cache.get("huge")).toBeUndefined();
    expect(cache.get("b")).toBeDefined();
  });

  it("invalidates mutable files on refresh and mutation even when diff statistics are unchanged", () => {
    const key = diffFileCacheKey(input);
    expect(diffFileCacheKey({ ...input, previewVersion: 2 })).not.toBe(key);
    expect(diffFileCacheKey({ ...input, mutationId: "saved" })).not.toBe(key);
    expect(diffFileCacheKey({ ...input, cwd: "/another-repo" })).not.toBe(key);
    expect(diffFileCacheKey({ ...input, environmentId: "another-env" })).not.toBe(key);
    expect(diffFileCacheKey({ ...input, ignoreWhitespace: true })).not.toBe(key);
  });

  it("retains immutable commit files across unrelated workspace mutations and refreshes", () => {
    const committed = {
      ...input,
      sourceId: "commit:abc",
      commitOid: "abc",
      headRef: "abc",
      baseRef: "parent",
    };
    expect(diffFileCacheKey({ ...committed, previewVersion: 2, mutationId: "saved" })).toBe(
      diffFileCacheKey(committed),
    );
    expect(diffFileCacheKey({ ...committed, commitOid: "def", headRef: "def" })).not.toBe(
      diffFileCacheKey(committed),
    );
  });
});
