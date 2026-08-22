import { describe, expect, it } from "vite-plus/test";

import { resolveReviewGitFileLoad } from "./reviewGitFileLoad";

describe("resolveReviewGitFileLoad", () => {
  const readyPatch = { ok: true as const, diff: "diff --git a/a.ts b/a.ts", truncated: false };
  const readyContents = { ok: true as const, oldContents: "old", newContents: "new" };

  it("waits until both RPCs have settled", () => {
    expect(
      resolveReviewGitFileLoad({
        requestId: 1,
        latestRequestId: 1,
        patch: readyPatch,
        contents: null,
      }),
    ).toEqual({ status: "pending" });
  });

  it("drops a stale pair", () => {
    expect(
      resolveReviewGitFileLoad({
        requestId: 1,
        latestRequestId: 2,
        patch: readyPatch,
        contents: readyContents,
      }),
    ).toEqual({ status: "stale" });
  });

  it("fails the load when either RPC fails", () => {
    expect(
      resolveReviewGitFileLoad({
        requestId: 1,
        latestRequestId: 1,
        patch: readyPatch,
        contents: { ok: false, error: "contents failed" },
      }),
    ).toEqual({ status: "error", error: "contents failed" });
  });

  it("is ready only when both RPCs succeed", () => {
    expect(
      resolveReviewGitFileLoad({
        requestId: 1,
        latestRequestId: 1,
        patch: readyPatch,
        contents: readyContents,
      }),
    ).toEqual({
      status: "ready",
      diff: readyPatch.diff,
      truncated: false,
      oldContents: "old",
      newContents: "new",
    });
  });
});
