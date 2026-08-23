import type { CodeViewScrollTarget, FileDiffMetadata } from "@pierre/diffs";
import type { TurnId } from "@t3tools/contracts";

import { getDiffLineStat } from "./diffRendering";
import type { TurnDiffFileChange } from "../types";

export const DIFF_FILE_TREE_DEFAULT_WIDTH = 200;
export const DIFF_FILE_TREE_MIN_WIDTH = 140;
export const DIFF_FILE_TREE_DIFFS_MIN_WIDTH = 240;
export const DIFF_FILE_TREE_WIDTH_STORAGE_KEY = "t3code:diff-panel-file-tree-width";
export const DIFF_FILE_TREE_VISIBLE_BY_DEFAULT = true;

export function collapseAllExcept(
  fileKeys: ReadonlyArray<string>,
  targetKey: string,
): ReadonlySet<string> {
  return new Set(fileKeys.filter((fileKey) => fileKey !== targetKey));
}

export function hunkScrollTarget(
  fileDiff: Pick<FileDiffMetadata, "hunks">,
  fileKey: string,
  hunkIndex: number,
): CodeViewScrollTarget {
  const hunk = fileDiff.hunks[hunkIndex];
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

export function firstHunkScrollTarget(
  fileDiff: Pick<FileDiffMetadata, "hunks">,
  fileKey: string,
): CodeViewScrollTarget {
  return hunkScrollTarget(fileDiff, fileKey, 0);
}

export function stepDiffHunkIndex(currentIndex: number, hunkCount: number, step: number): number {
  if (hunkCount <= 0) return 0;
  return Math.min(hunkCount - 1, Math.max(0, currentIndex + step));
}

export function diffHunkNavLabel(hunkIndex: number, hunkCount: number): string {
  return `${hunkIndex + 1} of ${hunkCount}`;
}

export function shouldShowDiffHunkNav(hunkCount: number): boolean {
  return hunkCount > 1;
}

export function shouldRenderDiffHunkNav(input: {
  readonly collapsed: boolean;
  readonly hunkCount: number;
}): boolean {
  return !input.collapsed && shouldShowDiffHunkNav(input.hunkCount);
}

export const DIFF_HYDRATION_WAIT_TIMEOUT_MS = 2_000;

export function waitForFileDiffHydration(
  fileDiff: Pick<FileDiffMetadata, "isPartial">,
  options: {
    shouldHydrate: boolean;
    schedule?: (callback: () => void) => void;
    now?: () => number;
    timeoutMs?: number;
  },
): Promise<void> {
  if (!options.shouldHydrate || !fileDiff.isPartial) {
    return Promise.resolve();
  }

  const schedule = options.schedule ?? ((callback) => requestAnimationFrame(callback));
  const now = options.now ?? Date.now;
  const timeoutMs = options.timeoutMs ?? DIFF_HYDRATION_WAIT_TIMEOUT_MS;
  const startedAt = now();

  return new Promise((resolve) => {
    const tick = () => {
      if (!fileDiff.isPartial || now() - startedAt >= timeoutMs) {
        resolve();
        return;
      }
      schedule(tick);
    };
    tick();
  });
}

export function afterNextLayout(schedule = requestAnimationFrame): Promise<void> {
  return new Promise((resolve) => {
    schedule(() => {
      schedule(() => {
        resolve();
      });
    });
  });
}

export async function revealFocusedDiffAfterHydration(options: {
  fileDiff: Pick<FileDiffMetadata, "isPartial">;
  needsHydration: boolean;
  isCancelled: () => boolean;
  scroll: () => void;
  wait?: typeof waitForFileDiffHydration;
  afterLayout?: () => Promise<void>;
}): Promise<void> {
  const wait = options.wait ?? waitForFileDiffHydration;
  const afterLayout = options.afterLayout ?? afterNextLayout;

  await wait(options.fileDiff, { shouldHydrate: options.needsHydration });
  if (options.isCancelled()) return;
  if (options.needsHydration) await afterLayout();
  if (!options.isCancelled()) options.scroll();
  if (options.isCancelled() || !options.fileDiff.isPartial) return;

  await wait(options.fileDiff, {
    shouldHydrate: true,
    timeoutMs: Number.MAX_SAFE_INTEGER,
  });
  if (options.isCancelled()) return;
  await afterLayout();
  if (!options.isCancelled()) options.scroll();
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

export function didRevealRequestChange(previousRequestId: number, requestId: number): boolean {
  return previousRequestId !== requestId;
}

/** Hide the pane until the first-hunk scroll lands so we never paint line 1 first. */
export function shouldHoldDiffFileReveal(input: {
  readonly selectedFileKey: string | null;
  readonly revealedFileKey: string | null;
  readonly mountKey: string;
  readonly revealedMountKey: string | null;
}): boolean {
  if (input.selectedFileKey === null) {
    return false;
  }
  return (
    input.selectedFileKey !== input.revealedFileKey || input.mountKey !== input.revealedMountKey
  );
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

export function toGitDiffTreeFiles(
  files: ReadonlyArray<{
    readonly path: string;
    readonly changeType: string;
    readonly additions: number | null;
    readonly deletions: number | null;
  }>,
): TurnDiffFileChange[] {
  return files.map((file) => ({
    path: file.path,
    kind: file.changeType,
    additions: file.additions ?? 0,
    deletions: file.deletions ?? 0,
  }));
}

export function sumManifestDiffStats(
  files: ReadonlyArray<{
    readonly additions: number | null;
    readonly deletions: number | null;
  }>,
): { additions: number; deletions: number } {
  let additions = 0;
  let deletions = 0;
  for (const file of files) {
    if (file.additions !== null) additions += file.additions;
    if (file.deletions !== null) deletions += file.deletions;
  }
  return { additions, deletions };
}
