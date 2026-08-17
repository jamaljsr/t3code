import { describe, expect, it } from "vite-plus/test";
import * as Schema from "effect/Schema";

import { ReviewDiffPreviewSource } from "./review.ts";

const decodeSource = Schema.decodeUnknownSync(ReviewDiffPreviewSource);

const baseSource = {
  id: "branch-range",
  kind: "branch-range",
  title: "Against main",
  baseRef: "main",
  headRef: "HEAD",
  diff: "",
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
});
