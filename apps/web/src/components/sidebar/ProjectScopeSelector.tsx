import { CheckIcon, ChevronDownIcon, FolderIcon, SettingsIcon } from "lucide-react";
import {
  useEffect,
  useMemo,
  useState,
  type Dispatch,
  type MouseEvent as ReactMouseEvent,
  type SetStateAction,
} from "react";
import { ProjectFavicon } from "../ProjectFavicon";
import { Button } from "../ui/button";
import { Menu, MenuItem, MenuPopup, MenuTrigger } from "../ui/menu";
import { SidebarMenuButton } from "../ui/sidebar";
import { Tooltip, TooltipPopup, TooltipTrigger } from "../ui/tooltip";
import type { SidebarProjectSnapshot } from "../../sidebarProjectGrouping";
import {
  reconcileProjectScopeSelection,
  resolveProjectScope,
  selectOnlyProjectScope,
  toggleProjectScopeSelection,
  type ProjectScopeSelection,
  type ResolvedProjectScope,
} from "./projectScopeSelection";

export function useProjectScope(
  projects: readonly SidebarProjectSnapshot[],
): readonly [
  ResolvedProjectScope<SidebarProjectSnapshot>,
  Dispatch<SetStateAction<ProjectScopeSelection>>,
] {
  const [selection, setSelection] = useState<ProjectScopeSelection>(null);

  useEffect(() => {
    setSelection((currentSelection) => reconcileProjectScopeSelection(currentSelection, projects));
  }, [projects]);

  const scope = useMemo(() => resolveProjectScope(selection, projects), [projects, selection]);

  return [scope, setSelection] as const;
}

interface ProjectScopeSelectorProps {
  readonly projects: readonly SidebarProjectSnapshot[];
  readonly scope: ResolvedProjectScope<SidebarProjectSnapshot>;
  readonly onSelectionChange: (selection: ProjectScopeSelection) => void;
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly onProjectSettings: (
    event: ReactMouseEvent<HTMLButtonElement>,
    project: SidebarProjectSnapshot,
  ) => void;
}

export function ProjectScopeTriggerContent({
  scope,
}: {
  readonly scope: ResolvedProjectScope<SidebarProjectSnapshot>;
}) {
  return (
    <>
      {scope.singleProject ? (
        <ProjectFavicon project={scope.singleProject} className="size-4 shrink-0" />
      ) : (
        <FolderIcon className="size-4 shrink-0" />
      )}
      <span className="min-w-0 flex-1 truncate">{scope.label}</span>
      <ChevronDownIcon className="-mr-px size-4 shrink-0" />
    </>
  );
}

export function ProjectScopeSelector({
  projects,
  scope,
  onSelectionChange,
  open,
  onOpenChange,
  onProjectSettings,
}: ProjectScopeSelectorProps) {
  return (
    <Menu open={open} onOpenChange={onOpenChange}>
      <MenuTrigger
        render={
          <SidebarMenuButton aria-label="Filter threads by project" className="min-w-0 flex-1" />
        }
      >
        <ProjectScopeTriggerContent scope={scope} />
      </MenuTrigger>
      <MenuPopup align="start" className="w-(--anchor-width)">
        <MenuItem closeOnClick onClick={() => onSelectionChange(null)}>
          <FolderIcon className="size-4 shrink-0" />
          <span className="min-w-0 truncate text-sm">All projects</span>
        </MenuItem>
        {projects.map((project) => {
          const selected = scope.selection === null || scope.selection.includes(project.projectKey);
          return (
            <MenuItem
              key={project.projectKey}
              closeOnClick
              onClick={() => onSelectionChange(selectOnlyProjectScope(project.projectKey))}
            >
              <Button
                size="icon-xs"
                variant="ghost-muted"
                aria-label={`Toggle ${project.displayName}`}
                aria-pressed={selected}
                onPointerDown={(event) => event.stopPropagation()}
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  onSelectionChange(
                    toggleProjectScopeSelection(scope.selection, projects, project.projectKey),
                  );
                }}
              >
                <CheckIcon
                  className={selected ? "size-3.5 text-foreground" : "size-3.5 opacity-30"}
                />
              </Button>
              <ProjectFavicon project={project} className="size-4 shrink-0" />
              <span className="min-w-0 flex-1 truncate">{project.displayName}</span>
              <Tooltip>
                <TooltipTrigger
                  render={
                    <Button
                      size="icon-xs"
                      variant="ghost-muted"
                      aria-label={`Project settings for ${project.displayName}`}
                      onPointerDown={(event) => event.stopPropagation()}
                      onClick={(event) => {
                        onOpenChange(false);
                        onProjectSettings(event, project);
                      }}
                    />
                  }
                >
                  <SettingsIcon className="size-3.5" />
                </TooltipTrigger>
                <TooltipPopup side="right">Project settings for {project.displayName}</TooltipPopup>
              </Tooltip>
            </MenuItem>
          );
        })}
      </MenuPopup>
    </Menu>
  );
}
