export type ReviewGitFilePatchResult =
  | { readonly ok: true; readonly diff: string; readonly truncated: boolean }
  | { readonly ok: false; readonly error: string };

export type ReviewGitFileContentsResult =
  | { readonly ok: true; readonly oldContents: string; readonly newContents: string }
  | { readonly ok: false; readonly error: string };

export type ReviewGitFileLoadResult =
  | {
      readonly status: "ready";
      readonly diff: string;
      readonly truncated: boolean;
      readonly oldContents: string;
      readonly newContents: string;
    }
  | { readonly status: "error"; readonly error: string }
  | { readonly status: "stale" }
  | { readonly status: "pending" };

export function resolveReviewGitFileLoad(input: {
  readonly requestId: number;
  readonly latestRequestId: number;
  readonly patch: ReviewGitFilePatchResult | null;
  readonly contents: ReviewGitFileContentsResult | null;
}): ReviewGitFileLoadResult {
  if (input.requestId !== input.latestRequestId) {
    return { status: "stale" };
  }
  if (input.patch === null || input.contents === null) {
    return { status: "pending" };
  }
  if (!input.contents.ok) {
    return { status: "error", error: input.contents.error };
  }
  if (!input.patch.ok) {
    return { status: "error", error: input.patch.error };
  }
  return {
    status: "ready",
    diff: input.patch.diff,
    truncated: input.patch.truncated,
    oldContents: input.contents.oldContents,
    newContents: input.contents.newContents,
  };
}
