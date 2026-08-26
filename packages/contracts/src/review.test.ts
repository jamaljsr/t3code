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

const decodeSource = Schema.decodeUnknownSync(ReviewDiffPreviewSource);
const decodePatchInput = Schema.decodeUnknownSync(ReviewDiffFilePatchInput);
const decodePatchResult = Schema.decodeUnknownSync(ReviewDiffFilePatchResult);

const baseSource = {
  id: "branch-range",
  kind: "branch-range",
  title: "Against main",
  baseRef: "main",
  headRef: "HEAD",
  files: [],
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

  it("requires diff and keeps files on the same source", () => {
    expect(() => decodeSource(baseSource)).toThrow();
    const parsed = decodeSource({
      ...baseSource,
      diff: "diff --git a/src/a.ts b/src/a.ts\n",
      files: [
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
    expect(parsed.files[0]?.path).toBe("src/a.ts");
  });

  it("lets a 1.0.3-shaped decoder ignore files and commits", () => {
    const parsed = decodeStoreV103({
      ...baseSource,
      diff: "diff --git a/src/a.ts b/src/a.ts\n",
      files: [
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
    expect(parsed).not.toHaveProperty("files");
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
