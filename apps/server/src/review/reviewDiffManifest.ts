import type { ReviewDiffFile, ReviewDiffFileChangeType } from "@t3tools/contracts";

type NumstatEntry = {
  additions: number | null;
  deletions: number | null;
  binary: boolean;
};

function splitNonEmptyLines(text: string): Array<string> {
  const lines: Array<string> = [];
  for (const line of text.split(/\r?\n/g)) {
    if (line.trim().length === 0) continue;
    lines.push(line);
  }
  return lines;
}

function resolveNumstatNewPath(rawPath: string): string {
  const braced = /^(.*)\{(.*) => (.*)\}(.*)$/.exec(rawPath);
  if (braced) {
    const [, prefix = "", , to = "", suffix = ""] = braced;
    const resolved =
      to.length === 0 && prefix.endsWith("/") && suffix.startsWith("/")
        ? `${prefix}${suffix.slice(1)}`
        : `${prefix}${to}${suffix}`;
    return resolved.length > 0 ? resolved : rawPath;
  }
  const arrow = rawPath.indexOf(" => ");
  if (arrow < 0) return rawPath;
  const to = rawPath.slice(arrow + " => ".length).trim();
  return to.length > 0 ? to : rawPath;
}

function parseNumstatEntries(numstat: string): Map<string, NumstatEntry> {
  const entries = new Map<string, NumstatEntry>();
  for (const line of splitNonEmptyLines(numstat)) {
    const [addedRaw, deletedRaw, ...pathParts] = line.split("\t");
    const rawPath =
      pathParts.length > 1 ? (pathParts.at(-1) ?? "").trim() : pathParts.join("\t").trim();
    if (rawPath.length === 0) continue;
    const path = resolveNumstatNewPath(rawPath);

    if (addedRaw === "-" && deletedRaw === "-") {
      entries.set(path, { additions: null, deletions: null, binary: true });
      continue;
    }

    const added = Number.parseInt(addedRaw ?? "0", 10);
    const deleted = Number.parseInt(deletedRaw ?? "0", 10);
    entries.set(path, {
      additions: Number.isFinite(added) ? added : 0,
      deletions: Number.isFinite(deleted) ? deleted : 0,
      binary: false,
    });
  }
  return entries;
}

function changeTypeForStatus(
  statusCode: string,
  score: number | null,
  additions: number | null,
  deletions: number | null,
): ReviewDiffFileChangeType {
  switch (statusCode) {
    case "A":
    case "C":
      return "new";
    case "D":
      return "deleted";
    case "M":
    case "T":
    case "U":
      return "change";
    case "R":
      return score === 100 && additions === 0 && deletions === 0 ? "rename-pure" : "rename-changed";
    default:
      return "change";
  }
}

/** Merge git name-status, numstat, and untracked paths into a sorted review diff file list. */
export function buildReviewDiffManifest(input: {
  readonly nameStatus: string;
  readonly numstat: string;
  readonly untrackedPaths: ReadonlyArray<string>;
  readonly listingTruncated: boolean;
}): { files: Array<ReviewDiffFile>; truncated: boolean } {
  const statsByPath = parseNumstatEntries(input.numstat);
  const filesByPath = new Map<string, ReviewDiffFile>();

  for (const line of splitNonEmptyLines(input.nameStatus)) {
    const columns = line.split("\t");
    const statusField = columns[0] ?? "";
    if (statusField.length === 0) continue;

    const statusCode = statusField.charAt(0);
    const scoreRaw = statusField.slice(1);
    const parsedScore = Number.parseInt(scoreRaw, 10);
    const score = scoreRaw.length > 0 && Number.isFinite(parsedScore) ? parsedScore : null;

    const isTwoPath = statusCode === "R" || statusCode === "C";
    const oldPathRaw = isTwoPath ? (columns[1] ?? "") : "";
    const path = isTwoPath ? (columns[2] ?? "") : (columns[1] ?? "");
    if (path.length === 0) continue;

    const stats = statsByPath.get(path);
    const additions = stats === undefined ? null : stats.additions;
    const deletions = stats === undefined ? null : stats.deletions;
    const binary = stats?.binary ?? false;

    filesByPath.set(path, {
      path,
      oldPath: statusCode === "R" && oldPathRaw.length > 0 ? oldPathRaw : null,
      changeType: changeTypeForStatus(statusCode, score, additions, deletions),
      additions,
      deletions,
      binary,
    });
  }

  for (const untrackedPath of input.untrackedPaths) {
    if (untrackedPath.length === 0 || filesByPath.has(untrackedPath)) continue;
    filesByPath.set(untrackedPath, {
      path: untrackedPath,
      oldPath: null,
      changeType: "new",
      additions: null,
      deletions: null,
      binary: false,
    });
  }

  const files = Array.from(filesByPath.values()).toSorted((a, b) =>
    a.path.localeCompare(b.path, undefined, { numeric: true, sensitivity: "base" }),
  );

  return { files, truncated: input.listingTruncated };
}
