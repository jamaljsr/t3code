import type { ReviewDiffFile, ReviewDiffFileChangeType } from "@t3tools/contracts";

type NumstatEntry = {
  additions: number | null;
  deletions: number | null;
  binary: boolean;
};

// `-z` output ends every field with NUL, so a trailing unterminated field was cut off by an
// output limit and is dropped.
function splitNulFields(text: string): Array<string> {
  const fields = text.split("\0");
  fields.pop();
  return fields;
}

// `git diff --numstat -z` writes `added\tdeleted\tpath`, or `added\tdeleted\t` followed by
// the old and new paths as separate fields for a rename or copy.
function parseNumstatEntries(numstat: string): Map<string, NumstatEntry> {
  const entries = new Map<string, NumstatEntry>();
  const fields = splitNulFields(numstat);
  for (let index = 0; index < fields.length; index++) {
    const match = /^(\d+|-)\t(\d+|-)\t([\s\S]*)$/.exec(fields[index]!);
    if (!match) continue;
    const [, addedRaw, deletedRaw, inlinePath] = match;
    let path = inlinePath!;
    if (path.length === 0) {
      index += 2;
      path = fields[index] ?? "";
    }
    if (path.length === 0) continue;

    if (addedRaw === "-" && deletedRaw === "-") {
      entries.set(path, { additions: null, deletions: null, binary: true });
      continue;
    }
    entries.set(path, {
      additions: Number(addedRaw),
      deletions: Number(deletedRaw),
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

/** Merge `-z` git name-status, numstat, and untracked paths into a sorted review diff file list. */
export function buildReviewDiffManifest(input: {
  readonly nameStatus: string;
  readonly numstat: string;
  readonly untrackedPaths: ReadonlyArray<string>;
  readonly listingTruncated: boolean;
}): { files: Array<ReviewDiffFile>; truncated: boolean } {
  const statsByPath = parseNumstatEntries(input.numstat);
  const filesByPath = new Map<string, ReviewDiffFile>();

  // `git diff --name-status -z` writes the status, then one path, or two for a rename or copy.
  const nameStatusFields = splitNulFields(input.nameStatus);
  for (let index = 0; index < nameStatusFields.length; index++) {
    const statusField = nameStatusFields[index]!;
    if (statusField.length === 0) continue;

    const statusCode = statusField.charAt(0);
    const scoreRaw = statusField.slice(1);
    const parsedScore = Number.parseInt(scoreRaw, 10);
    const score = scoreRaw.length > 0 && Number.isFinite(parsedScore) ? parsedScore : null;

    const isTwoPath = statusCode === "R" || statusCode === "C";
    const oldPathRaw = isTwoPath ? (nameStatusFields[++index] ?? "") : "";
    const path = nameStatusFields[++index] ?? "";
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
