import { useEffect } from "react";
import { describe, expect, it, vi } from "vite-plus/test";

import { act, fakeTimers, render } from "../../../test/render";
import { DiffFileTransition } from "./DiffFileTransition";

describe("DiffFileTransition", () => {
  it("keeps the outgoing viewer mounted until the incoming viewer is positioned", async () => {
    const mounted = new Set<string>();
    const mounts: string[] = [];
    function Viewer({ name }: { name: string }) {
      useEffect(() => {
        mounts.push(name);
        mounted.add(name);
        return () => {
          mounted.delete(name);
        };
      }, [name]);
      return <span>{name}</span>;
    }
    const ui = (name: string, ready: boolean) => (
      <DiffFileTransition identity={name} ready={ready} loadingPath={ready ? null : name}>
        <Viewer name={name} />
      </DiffFileTransition>
    );
    await using screen = await render(ui("a", true), { router: false });
    await screen.rerender(ui("b", false));
    expect([...mounted]).toEqual(["a", "b"]);
    await screen.rerender(ui("b", true));
    expect([...mounted]).toEqual(["b"]);
    expect(mounts).toEqual(["a", "b"]);
  });

  it("drops an abandoned incoming viewer without replacing the last ready viewer", async () => {
    const mounted = new Set<string>();
    function Viewer({ name }: { name: string }) {
      useEffect(() => {
        mounted.add(name);
        return () => {
          mounted.delete(name);
        };
      }, [name]);
      return <span>{name}</span>;
    }
    const ui = (name: string, ready: boolean) => (
      <DiffFileTransition identity={name} ready={ready} loadingPath={ready ? null : name}>
        <Viewer name={name} />
      </DiffFileTransition>
    );
    await using screen = await render(ui("a", true), { router: false });
    await screen.rerender(ui("b", false));
    await screen.rerender(ui("c", false));
    expect([...mounted]).toEqual(["a", "c"]);
    await screen.rerender(ui("c", true));
    expect([...mounted]).toEqual(["c"]);
  });

  it("shows a delayed loading notice and removes it after a completed switch", async () => {
    using _timers = fakeTimers();
    const ui = (loadingPath: string | null) => (
      <DiffFileTransition identity="a" ready loadingPath={loadingPath}>
        <span>a</span>
      </DiffFileTransition>
    );
    await using screen = await render(ui("b.ts"), { router: false });
    expect(screen.container.querySelectorAll('[role="status"]')).toHaveLength(0);
    await act(() => {
      vi.advanceTimersByTime(150);
    });
    expect(screen.container.querySelector('[role="status"]')?.textContent).toContain("b.ts");
    await screen.rerender(ui(null));
    expect(screen.container.querySelectorAll('[role="status"]')).toHaveLength(0);
  });
});
