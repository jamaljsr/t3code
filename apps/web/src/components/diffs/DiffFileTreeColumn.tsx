import { useEffect, useRef, useState } from "react";

import { useResizableWidth } from "~/hooks/useResizableWidth";
import {
  DIFF_FILE_TREE_DEFAULT_WIDTH,
  DIFF_FILE_TREE_MIN_WIDTH,
  DIFF_FILE_TREE_WIDTH_STORAGE_KEY,
  clampDiffFileTreeMaxWidth,
} from "../../lib/diffFileFocus";
import { type TurnDiffFileChange } from "../../types";
import { DiffFileTree } from "./DiffFileTree";

interface DiffFileTreeColumnProps {
  readonly files: ReadonlyArray<TurnDiffFileChange>;
  readonly selectedPath: string | null;
  readonly resolvedTheme: "light" | "dark";
  readonly onSelectFile: (path: string) => void;
}

export function DiffFileTreeColumn({
  files,
  selectedPath,
  resolvedTheme,
  onSelectFile,
}: DiffFileTreeColumnProps) {
  const columnRef = useRef<HTMLDivElement>(null);
  const [panelWidth, setPanelWidth] = useState<number | null>(null);
  const maxWidth =
    panelWidth === null ? Number.POSITIVE_INFINITY : clampDiffFileTreeMaxWidth(panelWidth);
  const { width, handlers } = useResizableWidth({
    storageKey: DIFF_FILE_TREE_WIDTH_STORAGE_KEY,
    defaultWidth: DIFF_FILE_TREE_DEFAULT_WIDTH,
    minWidth: DIFF_FILE_TREE_MIN_WIDTH,
    maxWidth,
    edge: "right",
  });

  useEffect(() => {
    const parent = columnRef.current?.parentElement;
    if (!parent) return;
    const update = () => setPanelWidth(parent.getBoundingClientRect().width);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(parent);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={columnRef}
      className="relative flex h-full min-h-0 shrink-0 flex-col border-r border-border bg-background"
      style={{ width: `${width}px` }}
    >
      <div className="min-h-0 flex-1 overflow-y-auto py-1">
        <DiffFileTree
          files={files}
          {...(selectedPath !== null ? { selectedPath } : {})}
          resolvedTheme={resolvedTheme}
          onSelectFile={onSelectFile}
        />
      </div>
      <div
        role="separator"
        aria-orientation="vertical"
        aria-label="Resize file tree"
        className="group absolute inset-y-0 -right-1 z-20 w-2 cursor-col-resize select-none"
        {...handlers}
      >
        <span
          aria-hidden
          className="pointer-events-none absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-transparent transition-colors duration-150 group-hover:bg-border group-active:bg-primary/60"
        />
      </div>
    </div>
  );
}
