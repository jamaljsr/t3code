import { scopeThreadRef } from "@t3tools/client-runtime/environment";
import { EnvironmentId, ThreadId, TurnId } from "@t3tools/contracts";
import { beforeEach, describe, expect, it } from "vite-plus/test";

import {
  resolveSelectedCommitOid,
  selectThreadDiffPanelSelection,
  useDiffPanelStore,
} from "./diffPanelStore";

const PREVIEW = { cwd: "/repo", commits: [{ oid: "aaa" }] };

const THREAD_REF = scopeThreadRef(EnvironmentId.make("environment-1"), ThreadId.make("thread-1"));

describe("diffPanelStore", () => {
  beforeEach(() =>
    useDiffPanelStore.setState({
      byThreadKey: {},
      branchBaseRefByThreadKey: {},
    }),
  );

  it("returns from a commit to All Changes with the same comparison base", () => {
    const store = useDiffPanelStore.getState();
    store.selectBranchBaseRef(THREAD_REF, "origin/main");
    store.selectCommit(THREAD_REF, { oid: "aaa", cwd: "/repo", branch: "feature" });
    const selected = selectThreadDiffPanelSelection(
      useDiffPanelStore.getState().byThreadKey,
      THREAD_REF,
    );
    expect(resolveSelectedCommitOid(selected, "/repo", "feature", PREVIEW)).toBe("aaa");
    expect(resolveSelectedCommitOid(selected, "/other", "feature", PREVIEW)).toBeNull();
    expect(resolveSelectedCommitOid(selected, "/repo", "other", PREVIEW)).toBeNull();
    store.selectGitScope(THREAD_REF, "branch");
    expect(
      selectThreadDiffPanelSelection(useDiffPanelStore.getState().byThreadKey, THREAD_REF),
    ).toEqual({ kind: "branch", baseRef: "origin/main" });
  });

  it("clears commit selection for working tree, turns, and a new comparison base", () => {
    const store = useDiffPanelStore.getState();
    const selectCommit = () =>
      store.selectCommit(THREAD_REF, { oid: "aaa", cwd: "/repo", branch: "feature" });
    const selectedOid = () =>
      resolveSelectedCommitOid(
        selectThreadDiffPanelSelection(useDiffPanelStore.getState().byThreadKey, THREAD_REF),
        "/repo",
        "feature",
        PREVIEW,
      );
    selectCommit();
    store.selectGitScope(THREAD_REF, "unstaged");
    expect(selectedOid()).toBeNull();
    selectCommit();
    store.selectTurn(THREAD_REF, TurnId.make("turn-1"));
    expect(selectedOid()).toBeNull();
    selectCommit();
    store.selectBranchBaseRef(THREAD_REF, "origin/develop");
    expect(selectedOid()).toBeNull();
    const otherThread = scopeThreadRef(
      EnvironmentId.make("environment-2"),
      ThreadId.make("thread-1"),
    );
    expect(
      resolveSelectedCommitOid(
        selectThreadDiffPanelSelection(useDiffPanelStore.getState().byThreadKey, otherThread),
        "/repo",
        "feature",
        PREVIEW,
      ),
    ).toBeNull();
  });

  it("does not request a saved commit before its repository list loads or after it disappears", () => {
    useDiffPanelStore
      .getState()
      .selectCommit(THREAD_REF, { oid: "aaa", cwd: "/repo", branch: "feature" });
    const selected = selectThreadDiffPanelSelection(
      useDiffPanelStore.getState().byThreadKey,
      THREAD_REF,
    );
    expect(resolveSelectedCommitOid(selected, "/repo", "feature", null)).toBeNull();
    expect(
      resolveSelectedCommitOid(selected, "/repo", "feature", {
        cwd: "/other",
        commits: [{ oid: "aaa" }],
      }),
    ).toBeNull();
    expect(
      resolveSelectedCommitOid(selected, "/repo", "feature", {
        cwd: "/repo",
        commits: [{ oid: "bbb" }],
      }),
    ).toBeNull();
    expect(resolveSelectedCommitOid(selected, "/repo", "feature", PREVIEW)).toBe("aaa");
  });

  it("switches repositories without restoring a commit saved from the old fallback", () => {
    const otherThread = scopeThreadRef(
      EnvironmentId.make("environment-1"),
      ThreadId.make("thread-2"),
    );
    const store = useDiffPanelStore.getState();
    store.selectCommit(THREAD_REF, { oid: "aaa", cwd: "/repo", branch: "feature" });
    store.selectCommit(otherThread, { oid: "aaa", cwd: "/other", branch: "feature" });
    const selection = selectThreadDiffPanelSelection(
      useDiffPanelStore.getState().byThreadKey,
      otherThread,
    );
    expect(
      resolveSelectedCommitOid(selection, "/other", "feature", {
        cwd: "/other",
        commits: [{ oid: "bbb" }],
      }),
    ).toBeNull();
    store.selectCommit(otherThread, { oid: "bbb", cwd: "/other", branch: "feature" });
    const nextSelection = selectThreadDiffPanelSelection(
      useDiffPanelStore.getState().byThreadKey,
      otherThread,
    );
    expect(
      resolveSelectedCommitOid(nextSelection, "/other", "feature", {
        cwd: "/other",
        commits: [{ oid: "bbb" }],
      }),
    ).toBe("bbb");
    expect(
      resolveSelectedCommitOid(
        selectThreadDiffPanelSelection(useDiffPanelStore.getState().byThreadKey, THREAD_REF),
        "/repo",
        "feature",
        PREVIEW,
      ),
    ).toBe("aaa");
  });

  it("defaults each thread to branch changes when the working tree is clean", () => {
    expect(
      selectThreadDiffPanelSelection(useDiffPanelStore.getState().byThreadKey, THREAD_REF),
    ).toEqual({ kind: "branch", baseRef: null });
  });

  it("defaults each thread to working changes when the working tree is dirty", () => {
    expect(
      selectThreadDiffPanelSelection(useDiffPanelStore.getState().byThreadKey, THREAD_REF, true),
    ).toEqual({ kind: "unstaged" });
  });

  it("preserves an explicit scope selection when the working tree state changes", () => {
    useDiffPanelStore.getState().selectGitScope(THREAD_REF, "branch");

    expect(
      selectThreadDiffPanelSelection(useDiffPanelStore.getState().byThreadKey, THREAD_REF, true),
    ).toEqual({ kind: "branch", baseRef: null });
  });

  it("clears incompatible selection fields when changing scopes", () => {
    const store = useDiffPanelStore.getState();
    store.selectTurn(THREAD_REF, TurnId.make("turn-1"), "src/app.ts");
    store.selectGitScope(THREAD_REF, "unstaged");

    expect(
      selectThreadDiffPanelSelection(useDiffPanelStore.getState().byThreadKey, THREAD_REF),
    ).toEqual({ kind: "unstaged" });

    useDiffPanelStore.getState().selectBranchBaseRef(THREAD_REF, " origin/main ");
    expect(
      selectThreadDiffPanelSelection(useDiffPanelStore.getState().byThreadKey, THREAD_REF),
    ).toEqual({ kind: "branch", baseRef: "origin/main" });
  });

  it("increments the reveal request when opening the same turn file again", () => {
    const turnId = TurnId.make("turn-1");
    useDiffPanelStore.getState().selectTurn(THREAD_REF, turnId, "src/app.ts");
    useDiffPanelStore.getState().selectTurn(THREAD_REF, turnId, "src/app.ts");

    expect(
      selectThreadDiffPanelSelection(useDiffPanelStore.getState().byThreadKey, THREAD_REF),
    ).toEqual({ kind: "turn", turnId, filePath: "src/app.ts", revealRequestId: 2 });
  });

  it("restores the selected branch base after visiting another scope", () => {
    useDiffPanelStore.getState().selectBranchBaseRef(THREAD_REF, "origin/main");
    useDiffPanelStore.getState().selectGitScope(THREAD_REF, "unstaged");
    useDiffPanelStore.getState().selectGitScope(THREAD_REF, "branch");

    expect(
      selectThreadDiffPanelSelection(useDiffPanelStore.getState().byThreadKey, THREAD_REF),
    ).toEqual({ kind: "branch", baseRef: "origin/main" });
  });

  it("reconciles a missing turn selection to the latest available turn", () => {
    const missingTurnId = TurnId.make("turn-missing");
    const latestTurnId = TurnId.make("turn-latest");
    useDiffPanelStore.getState().selectTurn(THREAD_REF, missingTurnId, "src/app.ts");
    useDiffPanelStore.getState().reconcileTurnSelection(THREAD_REF, [latestTurnId]);

    expect(
      selectThreadDiffPanelSelection(useDiffPanelStore.getState().byThreadKey, THREAD_REF),
    ).toEqual({
      kind: "turn",
      turnId: latestTurnId,
      filePath: "src/app.ts",
      revealRequestId: 1,
    });
  });
});
