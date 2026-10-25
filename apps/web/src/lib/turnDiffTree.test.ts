import { describe, expect, it } from "vite-plus/test";

import { buildTurnDiffTree } from "./turnDiffTree";

describe("buildTurnDiffTree", () => {
  it.each([
    ["new", "added"],
    ["added", "added"],
    ["change", "modified"],
    ["modified", "modified"],
    ["deleted", "deleted"],
    ["rename-pure", "renamed"],
    ["rename-changed", "renamed"],
    ["renamed", "renamed"],
    ["unknown", null],
  ] as const)(
    "preserves %s status through directory compaction without line changes",
    (kind, status) => {
      const tree = buildTurnDiffTree([
        { path: "src/assets/logo.png", kind, additions: 0, deletions: 0 },
      ]);

      expect(tree).toEqual([
        expect.objectContaining({
          kind: "directory",
          name: "src/assets",
          children: [
            expect.objectContaining({ kind: "file", path: "src/assets/logo.png", status }),
          ],
        }),
      ]);
    },
  );

  it("builds nested directory nodes with aggregated stats", () => {
    const tree = buildTurnDiffTree([
      { path: "src/index.ts", kind: "modified", additions: 2, deletions: 1 },
      { path: "src/components/Button.tsx", kind: "modified", additions: 4, deletions: 2 },
      { path: "README.md", kind: "modified", additions: 1, deletions: 0 },
    ]);

    expect(tree).toEqual([
      {
        kind: "directory",
        name: "src",
        path: "src",
        stat: { additions: 6, deletions: 3 },
        children: [
          {
            kind: "directory",
            name: "components",
            path: "src/components",
            stat: { additions: 4, deletions: 2 },
            children: [
              {
                kind: "file",
                status: "modified",
                name: "Button.tsx",
                path: "src/components/Button.tsx",
                stat: { additions: 4, deletions: 2 },
              },
            ],
          },
          {
            kind: "file",
            status: "modified",
            name: "index.ts",
            path: "src/index.ts",
            stat: { additions: 2, deletions: 1 },
          },
        ],
      },
      {
        kind: "file",
        status: "modified",
        name: "README.md",
        path: "README.md",
        stat: { additions: 1, deletions: 0 },
      },
    ]);
  });

  it("keeps zero-valued file stats and includes only their numeric contribution", () => {
    const tree = buildTurnDiffTree([
      { path: "docs/notes.md", kind: "modified", additions: 0, deletions: 0 },
      { path: "docs/todo.md", kind: "modified", additions: 1, deletions: 1 },
    ]);

    expect(tree).toEqual([
      {
        kind: "directory",
        name: "docs",
        path: "docs",
        stat: { additions: 1, deletions: 1 },
        children: [
          {
            kind: "file",
            status: "modified",
            name: "notes.md",
            path: "docs/notes.md",
            stat: { additions: 0, deletions: 0 },
          },
          {
            kind: "file",
            status: "modified",
            name: "todo.md",
            path: "docs/todo.md",
            stat: { additions: 1, deletions: 1 },
          },
        ],
      },
    ]);
  });

  it("normalizes file paths with windows separators", () => {
    const tree = buildTurnDiffTree([
      { path: "apps\\web\\src\\index.ts", kind: "modified", additions: 2, deletions: 1 },
    ]);

    expect(tree).toEqual([
      {
        kind: "directory",
        name: "apps/web/src",
        path: "apps/web/src",
        stat: { additions: 2, deletions: 1 },
        children: [
          {
            kind: "file",
            status: "modified",
            name: "index.ts",
            path: "apps/web/src/index.ts",
            stat: { additions: 2, deletions: 1 },
          },
        ],
      },
    ]);
  });

  it("compacts only single-directory chains and stops at branch points", () => {
    const tree = buildTurnDiffTree([
      { path: "apps/server/src/index.ts", kind: "modified", additions: 2, deletions: 1 },
      { path: "apps/server/main.ts", kind: "modified", additions: 4, deletions: 0 },
    ]);

    expect(tree).toEqual([
      {
        kind: "directory",
        name: "apps/server",
        path: "apps/server",
        stat: { additions: 6, deletions: 1 },
        children: [
          {
            kind: "directory",
            name: "src",
            path: "apps/server/src",
            stat: { additions: 2, deletions: 1 },
            children: [
              {
                kind: "file",
                status: "modified",
                name: "index.ts",
                path: "apps/server/src/index.ts",
                stat: { additions: 2, deletions: 1 },
              },
            ],
          },
          {
            kind: "file",
            status: "modified",
            name: "main.ts",
            path: "apps/server/main.ts",
            stat: { additions: 4, deletions: 0 },
          },
        ],
      },
    ]);
  });
});
