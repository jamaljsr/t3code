import { useEffect, useRef, useState } from "react";

import {
  type AtomCommandResult,
  squashAtomCommandFailure,
} from "@t3tools/client-runtime/state/runtime";
import type {
  EnvironmentId,
  ReviewDiffFile,
  ReviewDiffPreviewSourceKind,
} from "@t3tools/contracts";

import { useAtomCommand } from "../../state/use-atom-command";
import { reviewEnvironment } from "../../state/review";
import {
  resolveReviewGitFileLoad,
  type ReviewGitFileContentsResult,
  type ReviewGitFilePatchResult,
} from "./reviewGitFileLoad";

export interface ReviewGitDisplayedFile {
  readonly path: string;
  readonly diffHash: string;
  readonly diff: string;
  readonly oldContents: string;
  readonly newContents: string;
  readonly truncated: boolean;
}

export interface ReviewGitFilePane {
  readonly displayedFile: ReviewGitDisplayedFile | null;
  readonly loadingPath: string | null;
  readonly fileError: string | null;
}

const EMPTY_PANE: ReviewGitFilePane = {
  displayedFile: null,
  loadingPath: null,
  fileError: null,
};

function gitFileLoadErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }
  if (typeof error === "string" && error.trim().length > 0) {
    return error;
  }
  return "Failed to load file diff.";
}

async function settleGitFileCommandResult<A, E>(
  execute: () => Promise<AtomCommandResult<A, E>>,
): Promise<
  { readonly ok: true; readonly value: A } | { readonly ok: false; readonly error: string }
> {
  try {
    const result = await execute();
    if (result._tag === "Success") {
      return { ok: true, value: result.value };
    }
    return { ok: false, error: gitFileLoadErrorMessage(squashAtomCommandFailure(result)) };
  } catch (error) {
    return { ok: false, error: gitFileLoadErrorMessage(error) };
  }
}

export function useReviewGitFileLoad(input: {
  readonly environmentId?: EnvironmentId;
  readonly cwd: string | null;
  readonly enabled: boolean;
  readonly sourceKind: ReviewDiffPreviewSourceKind | null;
  readonly diffHash: string | null;
  readonly baseRef: string | null;
  readonly headRef: string | null;
  readonly selectedFile: ReviewDiffFile | null;
}): ReviewGitFilePane {
  const getDiffFilePatch = useAtomCommand(
    reviewEnvironment.diffFilePatch,
    "review diff file patch",
  );
  const getDiffFileContents = useAtomCommand(
    reviewEnvironment.diffFileContents,
    "review diff file contents",
  );
  const requestIdRef = useRef(0);
  const [pane, setPane] = useState<ReviewGitFilePane>(EMPTY_PANE);

  const environmentId = input.environmentId;
  const cwd = input.cwd;
  const enabled = input.enabled;
  const sourceKind = input.sourceKind;
  const diffHash = input.diffHash;
  const baseRef = input.baseRef;
  const headRef = input.headRef;
  const selectedFile = input.selectedFile;
  const selectedPath = selectedFile?.path ?? null;
  const selectedOldPath = selectedFile?.oldPath ?? selectedPath;
  const selectedChangeType = selectedFile?.changeType;
  const selectedBinary = selectedFile?.binary === true;

  useEffect(() => {
    if (
      !enabled ||
      environmentId === undefined ||
      cwd === null ||
      sourceKind === null ||
      diffHash === null ||
      selectedPath === null ||
      selectedChangeType === undefined
    ) {
      requestIdRef.current += 1;
      setPane((current) =>
        current.loadingPath === null && current.fileError === null
          ? current
          : { ...current, loadingPath: null, fileError: null },
      );
      return;
    }

    if (selectedBinary) {
      requestIdRef.current += 1;
      setPane({
        displayedFile: null,
        loadingPath: null,
        fileError: null,
      });
      return;
    }

    const requestId = ++requestIdRef.current;
    const newPath = selectedPath;
    const oldPath = selectedOldPath ?? selectedPath;
    const changeType = selectedChangeType;
    const sourceDiffHash = diffHash;
    setPane((current) => ({
      ...current,
      loadingPath: newPath,
      fileError: null,
    }));

    const sharedInput = {
      cwd,
      sourceKind,
      changeType,
      baseRef,
      headRef,
      oldPath,
      newPath,
    };

    void (async () => {
      const [patchSettled, contentsSettled] = await Promise.all([
        settleGitFileCommandResult(() =>
          getDiffFilePatch({
            environmentId,
            input: sharedInput,
          }),
        ),
        settleGitFileCommandResult(() =>
          getDiffFileContents({
            environmentId,
            input: sharedInput,
          }),
        ),
      ]);
      const patch: ReviewGitFilePatchResult = patchSettled.ok
        ? { ok: true, diff: patchSettled.value.diff, truncated: patchSettled.value.truncated }
        : { ok: false, error: patchSettled.error };
      const contents: ReviewGitFileContentsResult = contentsSettled.ok
        ? {
            ok: true,
            oldContents: contentsSettled.value.oldContents,
            newContents: contentsSettled.value.newContents,
          }
        : { ok: false, error: contentsSettled.error };
      const resolved = resolveReviewGitFileLoad({
        requestId,
        latestRequestId: requestIdRef.current,
        patch,
        contents,
      });
      if (resolved.status === "stale" || resolved.status === "pending") {
        return;
      }
      if (resolved.status === "error") {
        setPane((current) => ({
          ...current,
          loadingPath: null,
          fileError: resolved.error,
        }));
        return;
      }
      setPane({
        displayedFile: {
          path: newPath,
          diffHash: sourceDiffHash,
          diff: resolved.diff,
          oldContents: resolved.oldContents,
          newContents: resolved.newContents,
          truncated: resolved.truncated,
        },
        loadingPath: null,
        fileError: null,
      });
    })();
  }, [
    baseRef,
    cwd,
    diffHash,
    enabled,
    environmentId,
    getDiffFileContents,
    getDiffFilePatch,
    headRef,
    selectedBinary,
    selectedChangeType,
    selectedOldPath,
    selectedPath,
    sourceKind,
  ]);

  return pane;
}
