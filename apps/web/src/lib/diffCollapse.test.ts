import { describe, expect, it } from "vite-plus/test";

import {
  areAllDiffFilesCollapsed,
  collapsedDiffFileKeysForScope,
  toggleAllDiffFiles,
} from "./diffCollapse";

const FILE_KEYS = ["src/app.ts", "src/index.ts"];
const FIRST_FILE_KEY = FILE_KEYS[0]!;

describe("diff collapse controls", () => {
  it("reports whether every rendered file is collapsed", () => {
    expect(areAllDiffFilesCollapsed(FILE_KEYS, new Set(FILE_KEYS))).toBe(true);
    expect(areAllDiffFilesCollapsed(FILE_KEYS, new Set([FIRST_FILE_KEY]))).toBe(false);
    expect(areAllDiffFilesCollapsed([], new Set())).toBe(false);
  });

  it("collapses all files when any rendered file is expanded", () => {
    expect(toggleAllDiffFiles(FILE_KEYS, new Set([FIRST_FILE_KEY]))).toEqual(new Set(FILE_KEYS));
  });

  it("expands all files when every rendered file is collapsed", () => {
    expect(toggleAllDiffFiles(FILE_KEYS, new Set(FILE_KEYS))).toEqual(new Set());
  });

  it("starts a new diff scope with every file collapsed", () => {
    expect(
      collapsedDiffFileKeysForScope({
        storedScopeKey: null,
        scopeKey: "thread:branch",
        storedFileKeys: new Set(),
        fileKeys: FILE_KEYS,
      }),
    ).toEqual(new Set(FILE_KEYS));
  });

  it("keeps the stored collapse set once the user has changed this scope", () => {
    expect(
      collapsedDiffFileKeysForScope({
        storedScopeKey: "thread:branch",
        scopeKey: "thread:branch",
        storedFileKeys: new Set([FIRST_FILE_KEY]),
        fileKeys: FILE_KEYS,
      }),
    ).toEqual(new Set([FIRST_FILE_KEY]));
  });
});
