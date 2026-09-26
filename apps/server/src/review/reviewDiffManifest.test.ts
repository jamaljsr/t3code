import { describe, expect, it } from "vite-plus/test";
import { buildReviewDiffManifest } from "./reviewDiffManifest.ts";

// Mirrors `git diff -z`, which terminates every field with NUL.
const z = (...fields: string[]) => fields.map((field) => `${field}\0`).join("");

describe("buildReviewDiffManifest", () => {
  it("merges name-status and numstat, including renames and binaries", () => {
    const files = buildReviewDiffManifest({
      nameStatus: z("M", "src/a.ts", "R100", "old.ts", "new.ts", "A", "bin/photo.png"),
      numstat: z("2\t1\tsrc/a.ts", "0\t0\t", "old.ts", "new.ts", "-\t-\tbin/photo.png"),
      untrackedPaths: [],
      listingTruncated: false,
    });
    expect(files.truncated).toBe(false);
    expect(files.files).toEqual([
      {
        path: "bin/photo.png",
        oldPath: null,
        changeType: "new",
        additions: null,
        deletions: null,
        binary: true,
      },
      {
        path: "new.ts",
        oldPath: "old.ts",
        changeType: "rename-pure",
        additions: 0,
        deletions: 0,
        binary: false,
      },
      {
        path: "src/a.ts",
        oldPath: null,
        changeType: "change",
        additions: 2,
        deletions: 1,
        binary: false,
      },
    ]);
  });

  it("marks a score below 100 as rename-changed", () => {
    const files = buildReviewDiffManifest({
      nameStatus: z("R80", "old.ts", "new.ts"),
      numstat: z("3\t1\t", "old.ts", "new.ts"),
      untrackedPaths: [],
      listingTruncated: false,
    });
    expect(files.files[0]).toMatchObject({
      path: "new.ts",
      oldPath: "old.ts",
      changeType: "rename-changed",
      additions: 3,
      deletions: 1,
    });
  });

  it("adds untracked paths as new with unknown stats and does not require numstat", () => {
    const files = buildReviewDiffManifest({
      nameStatus: "",
      numstat: "",
      untrackedPaths: ["scratch.ts"],
      listingTruncated: false,
    });
    expect(files.files).toEqual([
      {
        path: "scratch.ts",
        oldPath: null,
        changeType: "new",
        additions: null,
        deletions: null,
        binary: false,
      },
    ]);
  });

  it("sets truncated when any listing was cut", () => {
    const files = buildReviewDiffManifest({
      nameStatus: z("M", "a.ts"),
      numstat: z("1\t0\ta.ts"),
      untrackedPaths: [],
      listingTruncated: true,
    });
    expect(files.truncated).toBe(true);
  });

  it("treats a missed numstat join as unknown stats, not a pure rename", () => {
    const files = buildReviewDiffManifest({
      nameStatus: z("R100", "old.ts", "new.ts"),
      numstat: "",
      untrackedPaths: [],
      listingTruncated: false,
    });
    expect(files.files[0]).toMatchObject({
      path: "new.ts",
      oldPath: "old.ts",
      changeType: "rename-changed",
      additions: null,
      deletions: null,
    });
  });

  it("reads rename paths from separate fields in any directory layout", () => {
    const renames = [
      ["src/old.ts", "src/new.ts"],
      ["dir/foo/file.ts", "dir/bar/file.ts"],
      ["nested/old/file.ts", "nested/file.ts"],
      ["src/file.ts", "src/new/file.ts"],
    ] as const;
    const files = buildReviewDiffManifest({
      nameStatus: z(...renames.flatMap(([oldPath, path]) => ["R90", oldPath, path])),
      numstat: z(...renames.flatMap(([oldPath, path]) => ["3\t1\t", oldPath, path])),
      untrackedPaths: [],
      listingTruncated: false,
    });
    expect(files.files.map((file) => [file.oldPath, file.path, file.additions])).toEqual(
      renames
        .map(([oldPath, path]) => [oldPath, path, 3])
        .toSorted((a, b) => String(a[1]).localeCompare(String(b[1]))),
    );
  });

  it("keeps paths with spaces, tabs, and newlines exactly", () => {
    const paths = [" leading.txt", "trailing.txt ", "tab\tand\nnewline.txt"];
    const files = buildReviewDiffManifest({
      nameStatus: z(...paths.flatMap((path) => ["A", path])),
      numstat: z(...paths.map((path) => `1\t0\t${path}`)),
      untrackedPaths: [],
      listingTruncated: false,
    });
    expect(files.files.map((file) => [file.path, file.additions])).toEqual(
      paths.map((path) => [path, 1]).toSorted((a, b) => String(a[0]).localeCompare(String(b[0]))),
    );
  });

  it("drops a record that an output limit cut off", () => {
    const files = buildReviewDiffManifest({
      nameStatus: `${z("M", "complete.ts")}M\0partial`,
      numstat: `${z("1\t0\tcomplete.ts")}1\t0\tpart`,
      untrackedPaths: [],
      listingTruncated: true,
    });
    expect(files.files.map((file) => [file.path, file.additions])).toEqual([["complete.ts", 1]]);
    expect(files.truncated).toBe(true);
  });
});
