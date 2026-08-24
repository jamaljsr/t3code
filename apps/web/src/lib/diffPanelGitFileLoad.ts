export type GitFilePatchResult =
  | { readonly ok: true; readonly diff: string }
  | { readonly ok: false; readonly error: string };

export type GitFileContentsResult =
  | { readonly ok: true; readonly oldContents: string; readonly newContents: string }
  | { readonly ok: false; readonly error: string };

export type GitFileLoadResult =
  | {
      readonly status: "ready";
      readonly diff: string;
      readonly oldContents: string;
      readonly newContents: string;
    }
  | { readonly status: "error"; readonly error: string }
  | { readonly status: "stale" }
  | { readonly status: "pending" };

export function resolveGitFileLoad(input: {
  readonly requestId: number;
  readonly latestRequestId: number;
  readonly patch: GitFilePatchResult | null;
  readonly contents: GitFileContentsResult | null;
}): GitFileLoadResult {
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
    oldContents: input.contents.oldContents,
    newContents: input.contents.newContents,
  };
}
