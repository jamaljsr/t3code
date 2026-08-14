import type { CodeViewScrollTarget, FileDiffContentsLoader, FileDiffMetadata } from "@pierre/diffs";
import type { TurnId } from "@t3tools/contracts";

import { getDiffLineStat } from "./diffRendering";
import type { TurnDiffFileChange } from "../types";

export const DIFF_FILE_TREE_DEFAULT_WIDTH = 200;
export const DIFF_FILE_TREE_MIN_WIDTH = 140;
export const DIFF_FILE_TREE_DIFFS_MIN_WIDTH = 240;
export const DIFF_FILE_TREE_WIDTH_STORAGE_KEY = "t3code:diff-panel-file-tree-width";

const NEVER_SETTLING_FILE_CONTENTS = new Promise<never>(() => {});

export function collapseAllExcept(
  fileKeys: ReadonlyArray<string>,
  targetKey: string,
): ReadonlySet<string> {
  return new Set(fileKeys.filter((fileKey) => fileKey !== targetKey));
}

export function firstHunkScrollTarget(
  fileDiff: Pick<FileDiffMetadata, "hunks">,
  fileKey: string,
): CodeViewScrollTarget {
  const hunk = fileDiff.hunks[0];
  if (!hunk) {
    return { type: "item", id: fileKey, align: "start" };
  }
  if (hunk.additionLines > 0) {
    return {
      type: "line",
      id: fileKey,
      lineNumber: hunk.additionStart,
      side: "additions",
      align: "start",
    };
  }
  return {
    type: "line",
    id: fileKey,
    lineNumber: hunk.deletionStart,
    side: "deletions",
    align: "start",
  };
}

export function canExpandUnchanged(input: {
  readonly hasGitLoader: boolean;
  readonly selectedTurnId: TurnId | string | null;
}): boolean {
  return input.hasGitLoader && input.selectedTurnId === null;
}

export function shouldExpandUnchanged(input: {
  readonly canExpand: boolean;
  readonly focusedFileKey: string | null;
  readonly collapsedFileKeys: ReadonlySet<string>;
  readonly fileKeys: ReadonlyArray<string>;
}): boolean {
  if (
    !input.canExpand ||
    input.focusedFileKey === null ||
    input.collapsedFileKeys.has(input.focusedFileKey)
  ) {
    return false;
  }
  return input.fileKeys.every(
    (fileKey) => fileKey === input.focusedFileKey || input.collapsedFileKeys.has(fileKey),
  );
}

export function createFocusedFileContentsLoader(
  loadDiffFiles: FileDiffContentsLoader | undefined,
  focusedFileDiff: FileDiffMetadata | null,
): FileDiffContentsLoader | undefined {
  if (!loadDiffFiles || !focusedFileDiff) {
    return undefined;
  }
  return (fileDiff) => {
    if (fileDiff !== focusedFileDiff) {
      return NEVER_SETTLING_FILE_CONTENTS;
    }
    return loadDiffFiles(fileDiff);
  };
}

export function didRevealRequestChange(previousRequestId: number, requestId: number): boolean {
  return previousRequestId !== requestId;
}

export function clampDiffFileTreeMaxWidth(panelWidth: number): number {
  if (!Number.isFinite(panelWidth) || panelWidth <= 0) {
    return DIFF_FILE_TREE_DEFAULT_WIDTH;
  }
  const half = Math.floor(panelWidth * 0.5);
  const remainder = panelWidth - DIFF_FILE_TREE_DIFFS_MIN_WIDTH;
  return Math.max(DIFF_FILE_TREE_MIN_WIDTH, Math.min(half, remainder));
}

export function toTurnDiffTreeFiles(
  files: ReadonlyArray<{
    readonly fileDiff: FileDiffMetadata;
    readonly filePath: string;
  }>,
): TurnDiffFileChange[] {
  return files.map(({ fileDiff, filePath }) => {
    const stat = getDiffLineStat([fileDiff]);
    return {
      path: filePath,
      kind: fileDiff.type,
      additions: stat.additions,
      deletions: stat.deletions,
    };
  });
}
