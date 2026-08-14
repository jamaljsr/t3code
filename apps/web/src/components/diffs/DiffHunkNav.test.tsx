import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vite-plus/test";

import { DiffHunkNav } from "./DiffHunkNav";

describe("DiffHunkNav", () => {
  it("hides when the file has only one hunk", () => {
    const markup = renderToStaticMarkup(
      <DiffHunkNav hunkIndex={0} hunkCount={1} onPrevious={() => {}} onNext={() => {}} />,
    );
    expect(markup).toBe("");
  });

  it("shows a 1-based hunk count and disables the first-hunk previous button", () => {
    const markup = renderToStaticMarkup(
      <DiffHunkNav hunkIndex={0} hunkCount={3} onPrevious={() => {}} onNext={() => {}} />,
    );
    expect(markup).toContain("1 of 3");
    expect(markup).toContain('aria-label="Previous hunk"');
    expect(markup).toContain('aria-label="Next hunk"');
    expect(markup).toMatch(/aria-label="Previous hunk"[^>]*disabled/);
    expect(markup).not.toMatch(/aria-label="Next hunk"[^>]*disabled/);
  });

  it("disables next on the last hunk", () => {
    const markup = renderToStaticMarkup(
      <DiffHunkNav hunkIndex={2} hunkCount={3} onPrevious={() => {}} onNext={() => {}} />,
    );
    expect(markup).toContain("3 of 3");
    expect(markup).toMatch(/aria-label="Next hunk"[^>]*disabled/);
    expect(markup).not.toMatch(/aria-label="Previous hunk"[^>]*disabled/);
  });
});
