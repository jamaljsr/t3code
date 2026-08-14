import { describe, expect, it } from "vite-plus/test";

import { shouldShowDiffCommitPane, toggleExpandedCommitOid } from "./diffCommitList";

describe("shouldShowDiffCommitPane", () => {
  it("hides on turn diffs even when commits exist", () => {
    expect(
      shouldShowDiffCommitPane({
        selectedTurnId: "turn_1",
        commitCount: 2,
        showUncommitted: true,
        commitsError: false,
      }),
    ).toBe(false);
  });

  it("hides when the range is empty and the working tree is clean", () => {
    expect(
      shouldShowDiffCommitPane({
        selectedTurnId: null,
        commitCount: 0,
        showUncommitted: false,
        commitsError: false,
      }),
    ).toBe(false);
  });

  it("shows for uncommitted-only, commits, or a load error", () => {
    expect(
      shouldShowDiffCommitPane({
        selectedTurnId: null,
        commitCount: 0,
        showUncommitted: true,
        commitsError: false,
      }),
    ).toBe(true);
    expect(
      shouldShowDiffCommitPane({
        selectedTurnId: null,
        commitCount: 1,
        showUncommitted: false,
        commitsError: false,
      }),
    ).toBe(true);
    expect(
      shouldShowDiffCommitPane({
        selectedTurnId: null,
        commitCount: 0,
        showUncommitted: false,
        commitsError: true,
      }),
    ).toBe(true);
  });
});

describe("toggleExpandedCommitOid", () => {
  it("adds and removes an oid", () => {
    const opened = toggleExpandedCommitOid(new Set(), "aaa");
    expect([...opened]).toEqual(["aaa"]);
    expect([...toggleExpandedCommitOid(opened, "aaa")]).toEqual([]);
  });
});
