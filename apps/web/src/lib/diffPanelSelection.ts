const SORT_LOCALE_OPTIONS: Intl.CollatorOptions = { numeric: true, sensitivity: "base" };

export function resolveDiffPanelSelectedPath(input: {
  readonly paths: ReadonlyArray<string>;
  readonly requestedPath: string | null;
  readonly previousPath: string | null;
}): string | null {
  const sorted = [...input.paths].sort((a, b) =>
    a.localeCompare(b, undefined, SORT_LOCALE_OPTIONS),
  );
  if (input.requestedPath !== null && sorted.includes(input.requestedPath)) {
    return input.requestedPath;
  }
  if (input.previousPath !== null && sorted.includes(input.previousPath)) {
    return input.previousPath;
  }
  return sorted[0] ?? null;
}
