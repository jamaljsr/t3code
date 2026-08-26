export interface ProjectScopeProject {
  readonly projectKey: string;
  readonly displayName: string;
  readonly memberProjectRefs: ReadonlyArray<{
    readonly environmentId: string;
    readonly projectId: string;
  }>;
}

export type ProjectScopeSelection = readonly string[] | null;

export interface ResolvedProjectScope<T extends ProjectScopeProject> {
  readonly selection: ProjectScopeSelection;
  readonly selectedProjects: readonly T[];
  readonly scopedProjectKeys: ReadonlySet<string> | null;
  readonly singleProject: T | null;
  readonly label: string;
  readonly emptyStateLabel: string;
  readonly resetKey: string;
}

export function reconcileProjectScopeSelection<T extends ProjectScopeProject>(
  selection: ProjectScopeSelection,
  projects: readonly T[],
): ProjectScopeSelection {
  if (selection === null) return null;
  const selected = new Set(selection);
  const next = projects
    .map((project) => project.projectKey)
    .filter((projectKey) => selected.has(projectKey));
  if (next.length === 0 || next.length === projects.length) return null;
  if (
    next.length === selection.length &&
    next.every((projectKey, index) => projectKey === selection[index])
  )
    return selection;
  return next;
}

export function toggleProjectScopeSelection<T extends ProjectScopeProject>(
  selection: ProjectScopeSelection,
  projects: readonly T[],
  projectKey: string,
): ProjectScopeSelection {
  const reconciled = reconcileProjectScopeSelection(selection, projects);
  const availableKeys = projects.map((project) => project.projectKey);
  if (!availableKeys.includes(projectKey)) return reconciled;
  const selectedKeys = reconciled === null ? availableKeys : [...reconciled];
  if (selectedKeys.includes(projectKey)) {
    if (selectedKeys.length === 1) return reconciled;
    return reconcileProjectScopeSelection(
      selectedKeys.filter((selectedKey) => selectedKey !== projectKey),
      projects,
    );
  }
  return reconcileProjectScopeSelection([...selectedKeys, projectKey], projects);
}

export function selectOnlyProjectScope(projectKey: string): ProjectScopeSelection {
  return [projectKey];
}

export function resolveProjectScope<T extends ProjectScopeProject>(
  selection: ProjectScopeSelection,
  projects: readonly T[],
): ResolvedProjectScope<T> {
  const reconciled = reconcileProjectScopeSelection(selection, projects);
  const selectedKeys = reconciled === null ? null : new Set(reconciled);
  const selectedProjects =
    selectedKeys === null
      ? projects
      : projects.filter((project) => selectedKeys.has(project.projectKey));
  const singleProject =
    reconciled !== null && selectedProjects.length === 1 ? selectedProjects[0]! : null;
  const scopedProjectKeys =
    reconciled === null
      ? null
      : new Set(
          selectedProjects.flatMap((project) =>
            project.memberProjectRefs.map((ref) => `${ref.environmentId}:${ref.projectId}`),
          ),
        );
  return {
    selection: reconciled,
    selectedProjects,
    scopedProjectKeys,
    singleProject,
    label:
      reconciled === null
        ? "All projects"
        : (singleProject?.displayName ?? `${selectedProjects.length} projects`),
    emptyStateLabel:
      reconciled === null
        ? "No threads yet"
        : singleProject
          ? `No threads in ${singleProject.displayName} yet`
          : "No threads in selected projects yet",
    resetKey: reconciled === null ? "all" : reconciled.toSorted().join("\0"),
  };
}
