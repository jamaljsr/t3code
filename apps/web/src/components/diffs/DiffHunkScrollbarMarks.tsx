import type { DiffHunkScrollbarMark } from "../../lib/diffHunkScrollbar";

interface DiffHunkScrollbarMarksProps {
  readonly marks: ReadonlyArray<DiffHunkScrollbarMark>;
}

export function DiffHunkScrollbarMarks({ marks }: DiffHunkScrollbarMarksProps) {
  if (marks.length === 0) return null;

  return (
    <div className="diff-hunk-scrollbar" aria-hidden>
      {marks.map((mark, index) => (
        <span
          key={`${mark.kind}-${index}`}
          className={`diff-hunk-scrollbar-mark diff-hunk-scrollbar-mark-${mark.kind}`}
          style={{ top: `${mark.top * 100}%`, height: `${mark.height * 100}%` }}
        />
      ))}
    </div>
  );
}
