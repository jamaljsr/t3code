import { useEffect, useState } from "react";
import { ChevronRightIcon } from "lucide-react";
import type { TimestampFormat } from "@t3tools/contracts/settings";

import { cn } from "~/lib/utils";
import { formatShortTimestamp } from "../../timestampFormat";
import { shouldShowDiffCommitPane, toggleExpandedCommitOid } from "../../lib/diffCommitList";

export interface DiffCommitListCommit {
  readonly oid: string;
  readonly subject: string;
  readonly body: string;
  readonly authorName: string;
  readonly committedAt: string;
}

export function DiffCommitList(props: {
  readonly commits: ReadonlyArray<DiffCommitListCommit>;
  readonly commitsTruncated: boolean;
  readonly commitsError: boolean;
  readonly showUncommitted: boolean;
  readonly workingTreeSelected: boolean;
  readonly listIdentity: string;
  readonly timestampFormat: TimestampFormat;
  readonly onSelectUncommitted: () => void;
  readonly expandedOids?: ReadonlySet<string>;
}) {
  const {
    commits,
    commitsTruncated,
    commitsError,
    showUncommitted,
    workingTreeSelected,
    listIdentity,
    timestampFormat,
    onSelectUncommitted,
    expandedOids: expandedOidsProp,
  } = props;
  const [expandedOids, setExpandedOids] = useState<ReadonlySet<string>>(() => new Set());
  useEffect(() => {
    setExpandedOids(new Set());
  }, [listIdentity]);
  const expanded = expandedOidsProp ?? expandedOids;

  if (
    !shouldShowDiffCommitPane({
      selectedTurnId: null,
      commitCount: commits.length,
      showUncommitted,
      commitsError,
    })
  ) {
    return null;
  }

  return (
    <div className="flex min-h-0 flex-col">
      {commitsError ? (
        <p className="px-3 py-1.5 text-[11px] text-muted-foreground">Couldn’t load commits</p>
      ) : null}
      {showUncommitted ? (
        <button
          type="button"
          aria-current={workingTreeSelected ? "true" : undefined}
          className={cn(
            "flex w-full items-center rounded-xl px-3 py-1 text-left text-[11px] transition-colors hover:bg-accent/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            workingTreeSelected && "bg-accent/60",
          )}
          onClick={onSelectUncommitted}
        >
          Uncommitted
        </button>
      ) : null}
      {commits.map((commit) => {
        const isExpanded = expanded.has(commit.oid);
        const body = commit.body.trim();
        return (
          <div key={commit.oid}>
            <button
              type="button"
              aria-expanded={body.length > 0 ? isExpanded : undefined}
              className="flex w-full items-start gap-1.5 rounded-xl px-3 py-1 text-left transition-colors hover:bg-accent/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              onClick={() => {
                if (expandedOidsProp) return;
                setExpandedOids((current) => toggleExpandedCommitOid(current, commit.oid));
              }}
            >
              <ChevronRightIcon
                aria-hidden
                className={cn(
                  "mt-0.5 size-3.5 shrink-0 text-muted-foreground/70",
                  isExpanded && body.length > 0 && "rotate-90",
                )}
              />
              <span className="min-w-0 flex-1">
                <span className="flex items-baseline gap-2">
                  <span className="min-w-0 truncate text-[11px] text-foreground/90">
                    {commit.subject}
                  </span>
                  <span className="ml-auto shrink-0 font-mono text-[10px] text-muted-foreground">
                    {commit.oid.slice(0, 7)}
                  </span>
                </span>
                <span className="block truncate text-[10px] text-muted-foreground">
                  {commit.authorName} · {formatShortTimestamp(commit.committedAt, timestampFormat)}
                </span>
              </span>
            </button>
            {isExpanded && body.length > 0 ? (
              <p
                data-commit-body
                className="whitespace-pre-wrap px-8 pb-2 text-[11px] text-muted-foreground"
              >
                {body}
              </p>
            ) : null}
          </div>
        );
      })}
      {commitsTruncated ? (
        <p className="px-3 py-1.5 text-[10px] text-muted-foreground">Showing latest 100 commits</p>
      ) : null}
    </div>
  );
}
