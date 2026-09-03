import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vite-plus/test";
import type { SidebarProjectSnapshot } from "../../sidebarProjectGrouping";
import { resolveProjectScope, type ProjectScopeSelection } from "./projectScopeSelection";
import { ProjectScopeSelector, ProjectScopeTriggerContent } from "./ProjectScopeSelector";

const menuInteractions = vi.hoisted(() => ({
  closeMenu: null as ((open: boolean) => void) | null,
  allProjects: null as { activate: () => void } | null,
  projectRows: new Map<
    string,
    {
      activate: () => void;
    }
  >(),
  toggle: new Map<
    string,
    {
      activate: () => {
        preventDefault: ReturnType<typeof vi.fn>;
        stopPropagation: ReturnType<typeof vi.fn>;
      };
      onPointerDown?: (event: { stopPropagation: () => void }) => void;
      pressed?: boolean;
      muted?: boolean;
    }
  >(),
  settings: new Map<
    string,
    {
      onClick?: (event: { preventDefault: () => void; stopPropagation: () => void }) => void;
      onPointerDown?: (event: { stopPropagation: () => void }) => void;
    }
  >(),
}));

vi.mock("../ProjectFavicon", () => ({
  ProjectFavicon: () => <span>mocked project favicon</span>,
}));

vi.mock("../ui/button", () => ({
  Button: ({
    children,
    ...props
  }: {
    children?: unknown;
    "aria-label"?: string;
    "aria-pressed"?: boolean;
    className?: string;
    onClick?: (event: { preventDefault: () => void; stopPropagation: () => void }) => void;
    onPointerDown?: (event: { stopPropagation: () => void }) => void;
  }) => {
    const label = props["aria-label"];
    if (label?.startsWith("Toggle ")) {
      const projectName = label.slice("Toggle ".length);
      menuInteractions.toggle.set(projectName, {
        ...props,
        muted: props.className?.includes("opacity-30") ?? false,
        pressed: props["aria-pressed"] ?? false,
        activate: () => {
          let propagationStopped = false;
          const event = {
            preventDefault: vi.fn(),
            stopPropagation: vi.fn(() => {
              propagationStopped = true;
            }),
          };

          props.onClick?.(event);
          if (!propagationStopped) menuInteractions.projectRows.get(projectName)?.activate();
          return event;
        },
      });
    }
    if (label?.startsWith("Project settings for ")) {
      menuInteractions.settings.set(label.slice("Project settings for ".length), props);
    }
    return <>{children}</>;
  },
}));

vi.mock("../ui/menu", () => ({
  Menu: ({
    children,
    onOpenChange,
  }: {
    children?: unknown;
    onOpenChange?: (open: boolean) => void;
  }) => {
    menuInteractions.closeMenu = onOpenChange ?? null;
    return <>{children}</>;
  },
  MenuTrigger: ({ children }: { children?: unknown }) => <>{children}</>,
  MenuPopup: ({ children }: { children?: unknown }) => <>{children}</>,
  MenuItem: ({
    children,
    ...props
  }: {
    children?: unknown;
    closeOnClick?: boolean;
    onClick?: () => void;
  }) => {
    const markup = renderToStaticMarkup(<>{children}</>);
    const activate = () => {
      props.onClick?.();
      if (props.closeOnClick !== false) menuInteractions.closeMenu?.(false);
    };

    if (markup.includes("All projects")) {
      menuInteractions.allProjects = { activate };
      return <>{children}</>;
    }

    for (const name of ["Alpha", "Beta", "Gamma"]) {
      if (markup.includes(name)) {
        menuInteractions.projectRows.set(name, { activate });
      }
    }
    return <>{children}</>;
  },
}));

vi.mock("../ui/sidebar", () => ({
  SidebarMenuButton: ({ children }: { children?: unknown }) => <>{children}</>,
}));

vi.mock("../ui/tooltip", () => ({
  Tooltip: ({ children }: { children?: unknown }) => <>{children}</>,
  TooltipTrigger: ({ render }: { render?: unknown }) => <>{render}</>,
  TooltipPopup: ({ children }: { children?: unknown }) => <>{children}</>,
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

function renderSelector(selection: ProjectScopeSelection = null) {
  menuInteractions.closeMenu = null;
  menuInteractions.allProjects = null;
  menuInteractions.projectRows.clear();
  menuInteractions.toggle.clear();
  menuInteractions.settings.clear();

  const onSelectionChange = vi.fn();
  const onOpenChange = vi.fn();
  const onProjectSettings = vi.fn();

  renderToStaticMarkup(
    <ProjectScopeSelector
      projects={projects}
      scope={resolveProjectScope(selection, projects)}
      onSelectionChange={onSelectionChange}
      open
      onOpenChange={onOpenChange}
      onProjectSettings={onProjectSettings}
    />,
  );

  return { onOpenChange, onProjectSettings, onSelectionChange };
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

describe("ProjectScopeSelector interactions", () => {
  it("selects only the clicked project and closes the menu", () => {
    const { onOpenChange, onSelectionChange } = renderSelector(["alpha", "beta"]);

    menuInteractions.projectRows.get("Alpha")?.activate();

    expect(onSelectionChange).toHaveBeenCalledWith(["alpha"]);
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("resets to all projects and closes the menu", () => {
    const { onOpenChange, onSelectionChange } = renderSelector(["alpha"]);

    menuInteractions.allProjects?.activate();

    expect(onSelectionChange).toHaveBeenCalledWith(null);
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("toggles a project from its check without closing the menu", () => {
    const { onOpenChange, onSelectionChange } = renderSelector(["alpha", "beta"]);
    const event = menuInteractions.toggle.get("Alpha")?.activate();

    expect(event?.preventDefault).toHaveBeenCalledOnce();
    expect(event?.stopPropagation).toHaveBeenCalledOnce();
    expect(onSelectionChange).toHaveBeenCalledWith(["beta"]);
    expect(onSelectionChange).toHaveBeenCalledTimes(1);
    expect(onOpenChange).not.toHaveBeenCalled();
  });

  it("shows muted checks on unselected projects", () => {
    renderSelector(["alpha"]);

    expect(menuInteractions.toggle.get("Alpha")).toMatchObject({
      muted: false,
      pressed: true,
    });
    expect(menuInteractions.toggle.get("Beta")).toMatchObject({
      muted: true,
      pressed: false,
    });
  });

  it("stops row propagation from the check and settings actions", () => {
    renderSelector();
    const event = { stopPropagation: vi.fn() };

    menuInteractions.toggle.get("Alpha")?.onPointerDown?.(event);
    menuInteractions.settings.get("Alpha")?.onPointerDown?.(event);

    expect(event.stopPropagation).toHaveBeenCalledTimes(2);
  });
});
