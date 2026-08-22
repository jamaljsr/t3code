import { describe, expect, it } from "vite-plus/test";

import { resolveGitFileLoad } from "./diffPanelGitFileLoad";

describe("resolveGitFileLoad", () => {
  it("is ready only when patch and contents both succeed", () => {
    expect(
      resolveGitFileLoad({
        requestId: 2,
        latestRequestId: 2,
        patch: { ok: true, diff: "diff" },
        contents: { ok: true, oldContents: "a", newContents: "b" },
      }),
    ).toEqual({ status: "ready", diff: "diff", oldContents: "a", newContents: "b" });
  });

  it("fails if either side fails, even when the other succeeded", () => {
    expect(
      resolveGitFileLoad({
        requestId: 1,
        latestRequestId: 1,
        patch: { ok: true, diff: "diff" },
        contents: { ok: false, error: "boom" },
      }),
    ).toEqual({ status: "error", error: "boom" });
  });

  it("ignores a stale request", () => {
    expect(
      resolveGitFileLoad({
        requestId: 1,
        latestRequestId: 2,
        patch: { ok: true, diff: "diff" },
        contents: { ok: true, oldContents: "a", newContents: "b" },
      }),
    ).toEqual({ status: "stale" });
  });

  it("is pending until both sides have settled", () => {
    expect(
      resolveGitFileLoad({
        requestId: 1,
        latestRequestId: 1,
        patch: { ok: true, diff: "diff" },
        contents: null,
      }),
    ).toEqual({ status: "pending" });
  });
});
