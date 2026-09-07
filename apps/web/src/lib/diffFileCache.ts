import { buildPatchCacheKey, getRenderablePatch } from "./diffRendering";

export interface CachedDiffFile {
  readonly diff: string;
  readonly oldContents: string;
  readonly newContents: string;
  readonly renderablePatch: ReturnType<typeof getRenderablePatch>;
}

export function createDiffFileCache(maxEntries = 8, maxTextBytes = 8 * 1024 * 1024) {
  const entries = new Map<string, { file: CachedDiffFile; bytes: number }>();
  let textBytes = 0;

  return {
    get(key: string): CachedDiffFile | undefined {
      const entry = entries.get(key);
      if (!entry) return undefined;
      entries.delete(key);
      entries.set(key, entry);
      return entry.file;
    },
    set(key: string, contents: Omit<CachedDiffFile, "renderablePatch">): CachedDiffFile {
      const file = {
        ...contents,
        renderablePatch: getRenderablePatch(
          contents.diff,
          buildPatchCacheKey(key, "diff-panel:git"),
          {
            compactPartialHunkOffsets: false,
          },
        ),
      };
      const previous = entries.get(key);
      if (previous) {
        textBytes -= previous.bytes;
        entries.delete(key);
      }
      const bytes =
        2 * (contents.diff.length + contents.oldContents.length + contents.newContents.length);
      if (bytes > maxTextBytes) return file;
      entries.set(key, { file, bytes });
      textBytes += bytes;
      while (entries.size > maxEntries || textBytes > maxTextBytes) {
        const oldest = entries.entries().next().value;
        if (!oldest) break;
        textBytes -= oldest[1].bytes;
        entries.delete(oldest[0]);
      }
      return file;
    },
  };
}

export function diffFileCacheKey(input: {
  readonly environmentId: string;
  readonly cwd: string;
  readonly sourceId: string;
  readonly baseRef: string | null;
  readonly headRef: string | null;
  readonly diffHash: string;
  readonly oldPath: string;
  readonly newPath: string;
  readonly ignoreWhitespace: boolean;
  readonly commitOid: string | null;
  readonly previewVersion: number;
  readonly mutationId: string | null;
}): string {
  return JSON.stringify({
    ...input,
    // Commit objects are immutable. Mutable refs need a fresh entry after every preview refresh.
    previewVersion: input.commitOid ? null : input.previewVersion,
    mutationId: input.commitOid ? null : input.mutationId,
  });
}
