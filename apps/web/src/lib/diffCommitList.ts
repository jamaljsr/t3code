export function shouldShowDiffCommitPane(input: {
  readonly selectedTurnId: string | null;
  readonly commitCount: number;
  readonly showUncommitted: boolean;
  readonly commitsError: boolean;
}): boolean {
  if (input.selectedTurnId !== null) return false;
  return input.commitCount > 0 || input.showUncommitted || input.commitsError;
}

export function toggleExpandedCommitOid(
  expandedOids: ReadonlySet<string>,
  oid: string,
): ReadonlySet<string> {
  const next = new Set(expandedOids);
  if (next.has(oid)) next.delete(oid);
  else next.add(oid);
  return next;
}
