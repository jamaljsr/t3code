import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vite-plus/test";

import { DiffCommitList, type DiffCommitListCommit } from "./DiffCommitList";

const COMMIT: DiffCommitListCommit = {
  oid: "0123456789abcdef0123456789abcdef01234567",
  subject: "add the tree",
  body: "Full description.",
  authorName: "Ada",
  committedAt: "2026-08-14T12:00:00.000Z",
};

const EMPTY_BODY: DiffCommitListCommit = {
  ...COMMIT,
  oid: "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
  body: "   ",
};

function render(
  overrides: Partial<{
    commits: DiffCommitListCommit[];
    commitsTruncated: boolean;
    commitsError: boolean;
    showUncommitted: boolean;
    workingTreeSelected: boolean;
    expandedOids: ReadonlySet<string>;
  }> = {},
) {
  return renderToStaticMarkup(
    <DiffCommitList
      commits={[COMMIT]}
      commitsTruncated={false}
      commitsError={false}
      showUncommitted={false}
      workingTreeSelected={false}
      listIdentity="hash:main"
      timestampFormat="24-hour"
      onSelectUncommitted={() => {}}
      {...overrides}
    />,
  );
}

describe("DiffCommitList", () => {
  it("renders nothing when there is nothing to show", () => {
    expect(render({ commits: [], showUncommitted: false, commitsError: false })).toBe("");
  });

  it("shows the subject and short oid, and hides the body until expanded", () => {
    const markup = render();
    expect(markup).toContain("add the tree");
    expect(markup).toContain("0123456");
    expect(markup).toContain("Ada");
    expect(markup).not.toContain("Full description.");
  });

  it("shows the body when the oid is expanded and skips empty bodies", () => {
    const expanded = render({ expandedOids: new Set([COMMIT.oid]) });
    expect(expanded).toContain("Full description.");
    const empty = render({
      commits: [EMPTY_BODY],
      expandedOids: new Set([EMPTY_BODY.oid]),
    });
    expect(empty).not.toContain("Full description.");
    expect(empty).not.toMatch(/data-commit-body/);
  });

  it("highlights Uncommitted when the working tree is selected", () => {
    const markup = render({
      commits: [],
      showUncommitted: true,
      workingTreeSelected: true,
    });
    expect(markup).toContain("Uncommitted");
    expect(markup).toContain('aria-current="true"');
  });

  it("shows the load-error line and truncated footer", () => {
    const markup = render({
      commits: [COMMIT],
      commitsError: true,
      commitsTruncated: true,
    });
    expect(markup).toContain("Couldn’t load commits");
    expect(markup).toContain("Showing latest 100 commits");
  });
});
