import { describe, expect, it } from "vite-plus/test";
import { buildReviewDiffManifest } from "./reviewDiffManifest.ts";

describe("buildReviewDiffManifest", () => {
  it("merges name-status and numstat, including renames and binaries", () => {
    const files = buildReviewDiffManifest({
      nameStatus: ["M\tsrc/a.ts", "R100\told.ts\tnew.ts", "A\tbin/photo.png"].join("\n"),
      numstat: ["2\t1\tsrc/a.ts", "0\t0\told.ts => new.ts", "-\t-\tbin/photo.png"].join("\n"),
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
      nameStatus: "R80\told.ts\tnew.ts",
      numstat: "3\t1\told.ts => new.ts",
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
      nameStatus: "M\ta.ts",
      numstat: "1\t0\ta.ts",
      untrackedPaths: [],
      listingTruncated: true,
    });
    expect(files.truncated).toBe(true);
  });

  it("resolves same-directory braced numstat rename paths", () => {
    const files = buildReviewDiffManifest({
      nameStatus: "R100\tsrc/old.ts\tsrc/new.ts",
      numstat: "0\t0\tsrc/{old.ts => new.ts}",
      untrackedPaths: [],
      listingTruncated: false,
    });
    expect(files.files[0]).toMatchObject({
      path: "src/new.ts",
      oldPath: "src/old.ts",
      changeType: "rename-pure",
      additions: 0,
      deletions: 0,
    });
  });

  it("resolves prefix/suffix braced numstat rename paths", () => {
    const files = buildReviewDiffManifest({
      nameStatus: "R80\tdir/foo/file.ts\tdir/bar/file.ts",
      numstat: "3\t1\tdir/{foo => bar}/file.ts",
      untrackedPaths: [],
      listingTruncated: false,
    });
    expect(files.files[0]).toMatchObject({
      path: "dir/bar/file.ts",
      oldPath: "dir/foo/file.ts",
      changeType: "rename-changed",
      additions: 3,
      deletions: 1,
    });
  });

  it("treats a missed numstat join as unknown stats, not a pure rename", () => {
    const files = buildReviewDiffManifest({
      nameStatus: "R100\told.ts\tnew.ts",
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

  it("collapses empty-to braced numstat flatten renames", () => {
    const files = buildReviewDiffManifest({
      nameStatus: "R100\tnested/old/file.ts\tnested/file.ts",
      numstat: "0\t0\tnested/{old => }/file.ts",
      untrackedPaths: [],
      listingTruncated: false,
    });
    expect(files.files[0]).toMatchObject({
      path: "nested/file.ts",
      oldPath: "nested/old/file.ts",
      changeType: "rename-pure",
      additions: 0,
      deletions: 0,
    });
  });

  it("resolves empty-from braced numstat directory insertions", () => {
    const files = buildReviewDiffManifest({
      nameStatus: "R80\tsrc/file.ts\tsrc/new/file.ts",
      numstat: "3\t1\tsrc/{ => new}/file.ts",
      untrackedPaths: [],
      listingTruncated: false,
    });
    expect(files.files[0]).toMatchObject({
      path: "src/new/file.ts",
      oldPath: "src/file.ts",
      changeType: "rename-changed",
      additions: 3,
      deletions: 1,
    });
  });
});
