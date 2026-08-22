export interface ReviewPaneFileSelection {
  readonly sectionId: string | null;
  readonly fileId: string | null;
}

export function resolveSelectedReviewFileId(input: {
  readonly selection: ReviewPaneFileSelection;
  readonly sectionId: string | null;
  readonly availableFileIds: ReadonlyArray<string>;
}): string | null {
  if (input.availableFileIds.length === 0) {
    return null;
  }

  if (
    input.selection.sectionId === input.sectionId &&
    input.selection.fileId !== null &&
    input.availableFileIds.includes(input.selection.fileId)
  ) {
    return input.selection.fileId;
  }

  return input.availableFileIds[0] ?? null;
}
