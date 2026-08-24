import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vite-plus/test";

import { DiffFileTree } from "./DiffFileTree";

const NESTED_FILES = [
  { path: "apps/web/src/index.ts", kind: "modified", additions: 2, deletions: 1 },
  { path: "apps/web/src/main.ts", kind: "modified", additions: 3, deletions: 0 },
];

describe("DiffFileTree", () => {
  it("hides nested files when folders start collapsed", () => {
    const markup = renderToStaticMarkup(
      <DiffFileTree
        files={NESTED_FILES}
        allDirectoriesExpanded={false}
        resolvedTheme="light"
        onSelectFile={() => {}}
      />,
    );
    expect(markup).toContain("apps/web/src");
    expect(markup).not.toContain("index.ts");
    expect(markup).not.toContain("main.ts");
  });

  it("shows nested files when folders start expanded", () => {
    const markup = renderToStaticMarkup(
      <DiffFileTree
        files={NESTED_FILES}
        allDirectoriesExpanded
        resolvedTheme="light"
        onSelectFile={() => {}}
      />,
    );
    expect(markup).toContain("apps/web/src");
    expect(markup).toContain("index.ts");
    expect(markup).toContain("main.ts");
  });

  it("marks the selected file", () => {
    const markup = renderToStaticMarkup(
      <DiffFileTree
        files={NESTED_FILES}
        allDirectoriesExpanded
        resolvedTheme="light"
        selectedPath="apps/web/src/main.ts"
        onSelectFile={() => {}}
      />,
    );
    expect(markup).toContain('aria-current="true"');
    expect(markup).toContain("main.ts");
  });

  it("shows a footer when the file list is truncated", () => {
    const markup = renderToStaticMarkup(
      <DiffFileTree files={NESTED_FILES} truncated resolvedTheme="light" onSelectFile={() => {}} />,
    );
    expect(markup).toContain("File list truncated");
  });

  it("marks only the loadingPath row as busy", () => {
    const markup = renderToStaticMarkup(
      <DiffFileTree
        files={NESTED_FILES}
        allDirectoriesExpanded
        resolvedTheme="light"
        selectedPath="apps/web/src/main.ts"
        loadingPath="apps/web/src/main.ts"
        onSelectFile={() => {}}
      />,
    );
    expect(markup).toContain('aria-busy="true"');
    expect(markup).toContain("Loading");
    expect(markup.match(/aria-busy="true"/g)?.length).toBe(1);
  });
});
