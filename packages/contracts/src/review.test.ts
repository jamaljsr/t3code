import { describe, expect, it } from "vite-plus/test";
import * as Schema from "effect/Schema";

import {
  ReviewDiffFilePatchInput,
  ReviewDiffFilePatchResult,
  ReviewDiffPreviewSource,
} from "./review.ts";

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
    const parsed = decodeSource(baseSource);
    expect(parsed.commits).toBeUndefined();
    expect(parsed.commitsTruncated).toBeUndefined();
    expect(parsed.commitsError).toBeUndefined();
  });

  it("decodes commits on a branch-range source", () => {
    const parsed = decodeSource({
      ...baseSource,
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

  it("decodes a file row and rejects a legacy diff string as required", () => {
    const parsed = decodeSource({
      ...baseSource,
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
    expect(parsed.files[0]?.path).toBe("src/a.ts");
    expect(parsed).not.toHaveProperty("diff");
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
