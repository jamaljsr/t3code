import { describe, expect, it } from "vite-plus/test";
import * as Schema from "effect/Schema";

import { TrimmedNonEmptyString } from "./baseSchemas.ts";
import {
  ReviewDiffFilePatchInput,
  ReviewDiffFilePatchResult,
  ReviewDiffPreviewSource,
  ReviewDiffPreviewSourceKind,
} from "./review.ts";

const StoreV103ReviewDiffPreviewSource = Schema.Struct({
  id: TrimmedNonEmptyString,
  kind: ReviewDiffPreviewSourceKind,
  title: TrimmedNonEmptyString,
  baseRef: Schema.NullOr(TrimmedNonEmptyString),
  headRef: Schema.NullOr(TrimmedNonEmptyString),
  diff: Schema.String,
  diffHash: TrimmedNonEmptyString,
  truncated: Schema.Boolean,
});
const decodeStoreV103 = Schema.decodeUnknownSync(StoreV103ReviewDiffPreviewSource);

// The review source shape that App Store 1.3.0 decodes.
const StoreV130ReviewDiffPreviewSource = Schema.Struct({
  ...StoreV103ReviewDiffPreviewSource.fields,
  files: Schema.optionalKey(
    Schema.Array(
      Schema.Struct({
        path: Schema.String,
        previousPath: Schema.NullOr(Schema.String),
        additions: Schema.Number,
        deletions: Schema.Number,
      }),
    ),
  ),
});
const decodeStoreV130 = Schema.decodeUnknownSync(StoreV130ReviewDiffPreviewSource);

const decodeSource = Schema.decodeUnknownSync(ReviewDiffPreviewSource);
const decodePatchInput = Schema.decodeUnknownSync(ReviewDiffFilePatchInput);
const decodePatchResult = Schema.decodeUnknownSync(ReviewDiffFilePatchResult);

const baseSource = {
  id: "branch-range",
  kind: "branch-range",
  title: "Against main",
  baseRef: "main",
  headRef: "HEAD",
  manifest: [],
  diffHash: "abc",
  truncated: false,
};

describe("ReviewDiffPreviewSource commits", () => {
  it("decodes a source with no commit fields (older servers)", () => {
    const parsed = decodeSource({ ...baseSource, diff: "" });
    expect(parsed.commits).toBeUndefined();
    expect(parsed.commitsTruncated).toBeUndefined();
    expect(parsed.commitsError).toBeUndefined();
  });

  it("decodes commits on a branch-range source", () => {
    const parsed = decodeSource({
      ...baseSource,
      diff: "",
      commits: [
        {
          oid: "0123456789abcdef0123456789abcdef01234567",
          subject: "add the tree",
          body: "Full description.\n",
          authorName: "Ada",
          committedAt: "2026-08-14T12:00:00-05:00",
        },
      ],
      commitsTruncated: true,
      commitsError: false,
    });
    expect(parsed.commits?.[0]?.subject).toBe("add the tree");
    expect(parsed.commitsTruncated).toBe(true);
    expect(parsed.commitsError).toBe(false);
  });

  it("requires diff and keeps the manifest on the same source", () => {
    expect(() => decodeSource(baseSource)).toThrow();
    const parsed = decodeSource({
      ...baseSource,
      diff: "diff --git a/src/a.ts b/src/a.ts\n",
      manifest: [
        {
          path: "src/a.ts",
          oldPath: null,
          changeType: "change",
          additions: 2,
          deletions: 1,
          binary: false,
        },
      ],
    });
    expect(parsed.diff).toBe("diff --git a/src/a.ts b/src/a.ts\n");
    expect(parsed.manifest[0]?.path).toBe("src/a.ts");
  });

  it("lets a 1.0.3-shaped decoder ignore the manifest and commits", () => {
    const parsed = decodeStoreV103({
      ...baseSource,
      diff: "diff --git a/src/a.ts b/src/a.ts\n",
      manifest: [
        {
          path: "src/a.ts",
          oldPath: null,
          changeType: "change",
          additions: 2,
          deletions: 1,
          binary: false,
        },
      ],
      commits: [],
      commitsTruncated: false,
      commitsError: false,
    });
    expect(parsed.diff).toBe("diff --git a/src/a.ts b/src/a.ts\n");
    expect(parsed).not.toHaveProperty("manifest");
  });

  it("gives a 1.3.0-shaped decoder numeric file statistics", () => {
    const source = {
      ...baseSource,
      diff: "",
      files: [{ path: "image.png", previousPath: null, additions: 0, deletions: 0 }],
      manifest: [
        {
          path: "image.png",
          oldPath: null,
          changeType: "new",
          additions: null,
          deletions: null,
          binary: true,
        },
      ],
    };
    expect(decodeSource(source).files?.[0]?.previousPath).toBeNull();
    expect(decodeStoreV130(source).files?.[0]?.additions).toBe(0);
    expect(() => decodeStoreV130({ ...source, files: source.manifest })).toThrow();
  });

  it("decodes a per-file patch request and result", () => {
    const input = decodePatchInput({
      cwd: "/repo",
      sourceKind: "working-tree",
      changeType: "change",
      baseRef: "HEAD",
      headRef: null,
      oldPath: "src/a.ts",
      newPath: "src/a.ts",
      ignoreWhitespace: true,
    });
    expect(input.newPath).toBe("src/a.ts");
    const result = decodePatchResult({
      diff: "diff --git a/src/a.ts b/src/a.ts\n",
      truncated: false,
    });
    expect(result.truncated).toBe(false);
  });
});
