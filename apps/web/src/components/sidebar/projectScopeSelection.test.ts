import { describe, expect, it } from "vite-plus/test";
import {
  reconcileProjectScopeSelection,
  resolveProjectScope,
  selectOnlyProjectScope,
  toggleProjectScopeSelection,
  type ProjectScopeProject,
} from "./projectScopeSelection";

const projects = [
  {
    projectKey: "alpha",
    displayName: "Alpha",
    memberProjectRefs: [
      { environmentId: "local", projectId: "alpha-local" },
      { environmentId: "remote", projectId: "alpha-remote" },
    ],
  },
  {
    projectKey: "beta",
    displayName: "Beta",
    memberProjectRefs: [{ environmentId: "local", projectId: "beta-local" }],
  },
  {
    projectKey: "gamma",
    displayName: "Gamma",
    memberProjectRefs: [{ environmentId: "local", projectId: "gamma-local" }],
  },
] satisfies readonly ProjectScopeProject[];

describe("project scope selection", () => {
  it("unchecks from all", () => {
    expect(toggleProjectScopeSelection(null, projects, "beta")).toEqual(["alpha", "gamma"]);
  });

  it("normalizes a complete custom selection to all", () => {
    expect(toggleProjectScopeSelection(["alpha", "beta"], projects, "gamma")).toBeNull();
  });

  it("keeps the final checked project", () => {
    expect(toggleProjectScopeSelection(["alpha"], projects, "alpha")).toEqual(["alpha"]);
  });

  it("selects one project directly", () => {
    expect(selectOnlyProjectScope("beta")).toEqual(["beta"]);
  });

  it("drops missing and duplicate keys in project order", () => {
    expect(
      reconcileProjectScopeSelection(["gamma", "missing", "gamma", "alpha"], projects),
    ).toEqual(["alpha", "gamma"]);
  });

  it("falls back to all when the custom selection disappears", () => {
    expect(reconcileProjectScopeSelection(["missing"], projects)).toBeNull();
  });
});

describe("resolved project scope", () => {
  it("leaves all projects unfiltered", () => {
    expect(resolveProjectScope(null, projects)).toMatchObject({
      selection: null,
      scopedProjectKeys: null,
      singleProject: null,
      label: "All projects",
      emptyStateLabel: "No threads yet",
      resetKey: "all",
    });
  });

  it("expands a logical project to every physical member", () => {
    const scope = resolveProjectScope(["alpha"], projects);
    expect(scope.label).toBe("Alpha");
    expect(scope.emptyStateLabel).toBe("No threads in Alpha yet");
    expect([...scope.scopedProjectKeys!]).toEqual(["local:alpha-local", "remote:alpha-remote"]);
  });

  it("describes multiple projects with an order-independent reset key", () => {
    const scope = resolveProjectScope(["gamma", "alpha"], projects);
    expect(scope.label).toBe("2 projects");
    expect(scope.emptyStateLabel).toBe("No threads in selected projects yet");
    expect(scope.resetKey).toBe("alpha\0gamma");
  });
});
