import { ChevronDownIcon, ChevronUpIcon } from "lucide-react";

import {
  diffHunkNavLabel,
  shouldShowDiffHunkNav,
  stepDiffHunkIndex,
} from "../../lib/diffFileFocus";

interface DiffHunkNavProps {
  readonly hunkIndex: number;
  readonly hunkCount: number;
  readonly onPrevious: () => void;
  readonly onNext: () => void;
}

export function DiffHunkNav({ hunkIndex, hunkCount, onPrevious, onNext }: DiffHunkNavProps) {
  if (!shouldShowDiffHunkNav(hunkCount)) return null;

  const atStart = stepDiffHunkIndex(hunkIndex, hunkCount, -1) === hunkIndex;
  const atEnd = stepDiffHunkIndex(hunkIndex, hunkCount, 1) === hunkIndex;
  const label = diffHunkNavLabel(hunkIndex, hunkCount);

  return (
    <div
      className="ms-2 inline-flex shrink-0 items-center gap-0.5"
      onClick={(event) => event.stopPropagation()}
    >
      <button
        type="button"
        className={hunkNavButtonClassName}
        aria-label="Previous hunk"
        disabled={atStart}
        onClick={onPrevious}
      >
        <ChevronUpIcon className="size-3.5" />
      </button>
      <span
        className="px-0.5 text-center text-[11px] tabular-nums text-muted-foreground whitespace-nowrap"
        aria-label={`Hunk ${label}`}
      >
        {label}
      </span>
      <button
        type="button"
        className={hunkNavButtonClassName}
        aria-label="Next hunk"
        disabled={atEnd}
        onClick={onNext}
      >
        <ChevronDownIcon className="size-3.5" />
      </button>
    </div>
  );
}

const hunkNavButtonClassName =
  "inline-flex size-5 shrink-0 cursor-pointer items-center justify-center rounded-sm border-0 bg-transparent p-0 text-muted-foreground transition-colors hover:bg-foreground/10 hover:text-foreground focus-visible:outline-hidden disabled:pointer-events-none disabled:opacity-40";
