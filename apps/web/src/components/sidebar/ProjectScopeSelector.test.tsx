import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vite-plus/test";
import type { SidebarProjectSnapshot } from "../../sidebarProjectGrouping";
import { resolveProjectScope } from "./projectScopeSelection";
import { ProjectScopeTriggerContent } from "./ProjectScopeSelector";

vi.mock("../ProjectFavicon", () => ({
  ProjectFavicon: () => <span>mocked project favicon</span>,
}));

function project(projectKey: string, displayName: string): SidebarProjectSnapshot {
  return {
    id: projectKey as never,
    title: displayName,
    workspaceRoot: `/projects/${projectKey}`,
    defaultModelSelection: null,
    faviconPath: null,
    scripts: [],
    createdAt: "2026-01-01T00:00:00.000Z" as never,
    updatedAt: "2026-01-01T00:00:00.000Z" as never,
    environmentId: "local" as never,
    projectKey,
    displayName,
    groupedProjectCount: 1,
    environmentPresence: "local-only",
    allRemoteMembersAreDesktopLocal: false,
    memberProjects: [],
    memberProjectRefs: [{ environmentId: "local" as never, projectId: projectKey as never }],
    remoteEnvironmentLabels: [],
  };
}

const projects = [project("alpha", "Alpha"), project("beta", "Beta"), project("gamma", "Gamma")];

function render(scope: ReturnType<typeof resolveProjectScope<SidebarProjectSnapshot>>) {
  return renderToStaticMarkup(<ProjectScopeTriggerContent scope={scope} />);
}

describe("ProjectScopeTriggerContent", () => {
  it("uses the selected-project favicon only for a single custom project", () => {
    expect(render(resolveProjectScope(null, projects))).toContain("All projects");
    expect(render(resolveProjectScope(["alpha"], projects))).toContain("Alpha");
    expect(render(resolveProjectScope(["alpha", "beta"], projects))).toContain("2 projects");

    const allProjects = render(resolveProjectScope(null, projects));
    const singleProject = render(resolveProjectScope(["alpha"], projects));
    const multipleProjects = render(resolveProjectScope(["alpha", "beta"], projects));

    expect(singleProject).toContain("mocked project favicon");
    expect(allProjects).not.toContain("mocked project favicon");
    expect(multipleProjects).not.toContain("mocked project favicon");
  });
});
