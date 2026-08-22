import { useEffect, useMemo } from "react";

import { countReviewCommentContexts, parseReviewInlineComments } from "./reviewCommentSelection";
import { getCachedNativeReviewDiffData } from "./nativeReviewDiffAdapter";
import { markReviewEvent, measureReviewWork } from "./reviewPerf";
import { getCachedReviewParsedDiff } from "./reviewState";
import {
  buildReviewParsedDiff,
  hydrateReviewRenderableFile,
  sumReviewManifestStats,
  type ReviewParsedDiff,
  type ReviewSectionItem,
} from "./reviewModel";
import type { ReviewGitDisplayedFile } from "./useReviewGitFileLoad";

const EMPTY_INLINE_REVIEW_COMMENTS = Object.freeze([]);

const EMPTY_PARSED_DIFF: ReviewParsedDiff = { kind: "empty" };

function isReviewDiffDebugLoggingEnabled(): boolean {
  return typeof __DEV__ !== "undefined" ? __DEV__ : false;
}

function logReviewDiffDiagnostic(message: string, details?: Record<string, unknown>): void {
  if (!isReviewDiffDebugLoggingEnabled()) {
    return;
  }

  if (details) {
    console.log(`[review-sheet] ${message}`, details);
    return;
  }

  console.log(`[review-sheet] ${message}`);
}

export function formatHeaderDiffSummary(parsedDiff: ReviewParsedDiff): {
  readonly additions: string | null;
  readonly deletions: string | null;
} {
  if (parsedDiff.kind !== "files") {
    return { additions: null, deletions: null };
  }

  return {
    additions: `+${parsedDiff.additions}`,
    deletions: `-${parsedDiff.deletions}`,
  };
}

function selectTurnParsedFile(
  parsedDiff: ReviewParsedDiff,
  selectedFileId: string | null,
): ReviewParsedDiff {
  if (parsedDiff.kind !== "files") {
    return parsedDiff;
  }
  const selected =
    (selectedFileId
      ? parsedDiff.files.find((file) => file.id === selectedFileId || file.path === selectedFileId)
      : null) ?? parsedDiff.files[0];
  if (!selected) {
    return { kind: "empty" };
  }
  return {
    kind: "files",
    files: [selected],
    fileCount: 1,
    additions: selected.additions,
    deletions: selected.deletions,
    notice: parsedDiff.notice,
  };
}

function buildGitDisplayedParsedDiff(
  displayedFile: ReviewGitDisplayedFile,
  cacheScope: string,
): ReviewParsedDiff {
  const parsed = buildReviewParsedDiff(displayedFile.diff, cacheScope);
  if (parsed.kind !== "files") {
    if (displayedFile.truncated && parsed.kind === "empty") {
      return {
        kind: "raw",
        text: displayedFile.diff,
        reason: "Diff was truncated before it could be parsed completely. Showing the raw excerpt.",
        notice: "This file's diff was truncated.",
      };
    }
    return parsed.kind === "raw" && displayedFile.truncated
      ? { ...parsed, notice: "This file's diff was truncated." }
      : parsed;
  }
  const file = parsed.files[0];
  if (!file) {
    return parsed;
  }
  const hydrated = hydrateReviewRenderableFile(
    file,
    displayedFile.oldContents,
    displayedFile.newContents,
  );
  return {
    ...parsed,
    files: [hydrated],
    fileCount: 1,
    additions: hydrated.additions,
    deletions: hydrated.deletions,
    notice: displayedFile.truncated ? "This file's diff was truncated." : parsed.notice,
  };
}

export function useReviewDiffData(input: {
  readonly threadKey: string | null;
  readonly selectedSection: ReviewSectionItem | null;
  readonly selectedFileId: string | null;
  readonly gitDisplayedFile: ReviewGitDisplayedFile | null;
  readonly draftMessage: string;
}) {
  const { draftMessage, gitDisplayedFile, selectedFileId, selectedSection, threadKey } = input;
  const selectedSectionId = selectedSection?.id ?? null;
  const isGitSection =
    selectedSection?.kind === "working-tree" || selectedSection?.kind === "branch-range";

  const turnParsedDiff = useMemo(
    () =>
      measureReviewWork("parse-diff", () =>
        isGitSection
          ? EMPTY_PARSED_DIFF
          : getCachedReviewParsedDiff({
              threadKey,
              sectionId: selectedSection?.id ?? null,
              diff: selectedSection?.diff,
            }),
      ),
    [isGitSection, selectedSection?.diff, selectedSection?.id, threadKey],
  );

  const parsedDiff = useMemo(() => {
    if (isGitSection) {
      if (!gitDisplayedFile) {
        return EMPTY_PARSED_DIFF;
      }
      return measureReviewWork("parse-git-file", () =>
        buildGitDisplayedParsedDiff(
          gitDisplayedFile,
          `${selectedSectionId ?? "git"}:${gitDisplayedFile.diffHash}:${gitDisplayedFile.path}`,
        ),
      );
    }
    return selectTurnParsedFile(turnParsedDiff, selectedFileId);
  }, [gitDisplayedFile, isGitSection, selectedFileId, selectedSectionId, turnParsedDiff]);

  const headerDiffSummary = useMemo(() => {
    if (isGitSection && selectedSection) {
      const stats = sumReviewManifestStats(selectedSection.files);
      if (selectedSection.files.length === 0) {
        return { additions: null, deletions: null };
      }
      return {
        additions: `+${stats.additions}`,
        deletions: `-${stats.deletions}`,
      };
    }
    return formatHeaderDiffSummary(turnParsedDiff);
  }, [isGitSection, selectedSection, turnParsedDiff]);

  const inlineReviewComments = useMemo(
    () => parseReviewInlineComments(draftMessage),
    [draftMessage],
  );
  const selectedSectionInlineComments = useMemo(() => {
    if (!selectedSectionId || inlineReviewComments.length === 0) {
      return EMPTY_INLINE_REVIEW_COMMENTS;
    }
    return inlineReviewComments.filter((comment) => comment.sectionId === selectedSectionId);
  }, [inlineReviewComments, selectedSectionId]);
  const nativeReviewDiffData = useMemo(
    () =>
      measureReviewWork("build-native-diff-data", () =>
        getCachedNativeReviewDiffData({
          parsedDiff,
          comments: selectedSectionInlineComments,
        }),
      ),
    [parsedDiff, selectedSectionInlineComments],
  );
  const pendingReviewCommentCount = useMemo(
    () => countReviewCommentContexts(draftMessage),
    [draftMessage],
  );

  useEffect(() => {
    if (parsedDiff.kind !== "files") {
      return;
    }

    markReviewEvent("parsed-diff-ready", {
      sectionId: selectedSection?.id ?? null,
      fileCount: parsedDiff.fileCount,
      additions: parsedDiff.additions,
      deletions: parsedDiff.deletions,
      renderedItems: nativeReviewDiffData.rows.length,
    });
    logReviewDiffDiagnostic("parsed diff files", {
      selectedSectionId: selectedSection?.id ?? null,
      fileCount: parsedDiff.fileCount,
      renderableFileCount: parsedDiff.files.length,
    });
  }, [nativeReviewDiffData.rows.length, parsedDiff, selectedSection?.id]);

  return {
    parsedDiff,
    turnParsedDiff,
    headerDiffSummary,
    nativeReviewDiffData,
    pendingReviewCommentCount,
  };
}
