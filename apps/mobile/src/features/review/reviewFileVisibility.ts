import { useCallback, useMemo } from "react";

import { updateReviewExpandedFileIds, updateReviewViewedFileIds } from "./reviewState";

export interface ReviewFileVisibilityItem {
  readonly id: string;
}

export function getDefaultReviewExpandedFileIds(
  files: ReadonlyArray<{ readonly id: string }>,
): ReadonlyArray<string> {
  return files[0] ? [files[0].id] : [];
}

export function getValidReviewFileIds(
  files: ReadonlyArray<{ readonly id: string }>,
  fileIds: ReadonlyArray<string> | undefined,
): ReadonlyArray<string> {
  if (fileIds === undefined) {
    return getDefaultReviewExpandedFileIds(files);
  }

  const fileIdSet = new Set(files.map((file) => file.id));
  const valid = fileIds.filter((id) => fileIdSet.has(id));
  if (valid.length === 0) {
    return getDefaultReviewExpandedFileIds(files);
  }
  return [valid[0]];
}

export function getValidExplicitReviewFileIds(
  files: ReadonlyArray<{ readonly id: string }>,
  fileIds: ReadonlyArray<string> | undefined,
): ReadonlyArray<string> {
  if (fileIds === undefined) {
    return [];
  }

  const fileIdSet = new Set(files.map((file) => file.id));
  return fileIds.filter((id) => fileIdSet.has(id));
}

export function selectReviewFileId(fileId: string): ReadonlyArray<string> {
  return [fileId];
}

export function toggleReviewFileId(
  fileIds: ReadonlyArray<string>,
  fileId: string,
): ReadonlyArray<string> {
  return fileIds.includes(fileId) ? fileIds.filter((id) => id !== fileId) : [...fileIds, fileId];
}

export function removeReviewFileId(
  fileIds: ReadonlyArray<string>,
  fileId: string,
): ReadonlyArray<string> {
  return fileIds.includes(fileId) ? fileIds.filter((id) => id !== fileId) : fileIds;
}

export function useReviewFileVisibility(input: {
  readonly threadKey: string | null;
  readonly sectionId: string | null;
  readonly files: ReadonlyArray<ReviewFileVisibilityItem>;
  readonly cachedExpandedFileIds: ReadonlyArray<string> | undefined;
  readonly cachedViewedFileIds: ReadonlyArray<string> | undefined;
}) {
  const { cachedExpandedFileIds, cachedViewedFileIds, files, sectionId, threadKey } = input;

  const expandedFileIds = useMemo(
    () => getValidReviewFileIds(files, cachedExpandedFileIds),
    [cachedExpandedFileIds, files],
  );
  const viewedFileIds = useMemo(
    () => getValidExplicitReviewFileIds(files, cachedViewedFileIds),
    [cachedViewedFileIds, files],
  );
  const collapsedFileIds = useMemo(() => {
    const expandedFileIdSet = new Set(expandedFileIds);
    return files.reduce<string[]>((fileIds, file) => {
      if (!expandedFileIdSet.has(file.id)) {
        fileIds.push(file.id);
      }
      return fileIds;
    }, []);
  }, [expandedFileIds, files]);

  const toggleExpandedFile = useCallback(
    (fileId: string) => {
      if (!threadKey || !sectionId) {
        return;
      }

      updateReviewExpandedFileIds(threadKey, sectionId, () => selectReviewFileId(fileId));
    },
    [files, sectionId, threadKey],
  );

  const toggleViewedFile = useCallback(
    (fileId: string) => {
      if (!threadKey || !sectionId) {
        return;
      }

      const shouldCollapse = !viewedFileIds.includes(fileId);
      updateReviewViewedFileIds(threadKey, sectionId, (existing) =>
        toggleReviewFileId(getValidExplicitReviewFileIds(files, existing), fileId),
      );

      if (shouldCollapse) {
        updateReviewExpandedFileIds(threadKey, sectionId, (existing) =>
          removeReviewFileId(getValidReviewFileIds(files, existing), fileId),
        );
      }
    },
    [files, sectionId, threadKey, viewedFileIds],
  );

  return {
    expandedFileIds,
    viewedFileIds,
    collapsedFileIds,
    toggleExpandedFile,
    toggleViewedFile,
  };
}
