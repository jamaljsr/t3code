export function areAllDiffFilesCollapsed(
  fileKeys: ReadonlyArray<string>,
  collapsedFileKeys: ReadonlySet<string>,
): boolean {
  return fileKeys.length > 0 && fileKeys.every((fileKey) => collapsedFileKeys.has(fileKey));
}

export function toggleAllDiffFiles(
  fileKeys: ReadonlyArray<string>,
  collapsedFileKeys: ReadonlySet<string>,
): ReadonlySet<string> {
  return areAllDiffFilesCollapsed(fileKeys, collapsedFileKeys) ? new Set() : new Set(fileKeys);
}

export function collapsedDiffFileKeysForScope(input: {
  readonly storedScopeKey: string | null;
  readonly scopeKey: string | null;
  readonly storedFileKeys: ReadonlySet<string>;
  readonly fileKeys: ReadonlyArray<string>;
}): ReadonlySet<string> {
  if (input.storedScopeKey === input.scopeKey) {
    return input.storedFileKeys;
  }
  return new Set(input.fileKeys);
}
