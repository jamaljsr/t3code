import { act, useEffect } from "react";
import { create, type ReactTestRenderer } from "react-test-renderer";
import { afterEach, describe, expect, it, vi } from "vite-plus/test";
import { DiffFileTransition } from "./DiffFileTransition";

let renderer: ReactTestRenderer | undefined;
afterEach(async () => {
  await act(async () => renderer?.unmount());
  renderer = undefined;
  vi.useRealTimers();
});

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
    const render = (name: string, ready: boolean) => (
      <DiffFileTransition identity={name} ready={ready} loadingPath={ready ? null : name}>
        <Viewer name={name} />
      </DiffFileTransition>
    );
    await act(async () => {
      renderer = create(render("a", true));
    });
    await act(async () => {
      renderer!.update(render("b", false));
    });
    expect([...mounted]).toEqual(["a", "b"]);
    await act(async () => {
      renderer!.update(render("b", true));
    });
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
    const render = (name: string, ready: boolean) => (
      <DiffFileTransition identity={name} ready={ready} loadingPath={ready ? null : name}>
        <Viewer name={name} />
      </DiffFileTransition>
    );
    await act(async () => {
      renderer = create(render("a", true));
    });
    await act(async () => {
      renderer!.update(render("b", false));
    });
    await act(async () => {
      renderer!.update(render("c", false));
    });
    expect([...mounted]).toEqual(["a", "c"]);
    await act(async () => {
      renderer!.update(render("c", true));
    });
    expect([...mounted]).toEqual(["c"]);
  });

  it("shows a delayed loading notice and removes it after a completed switch", async () => {
    vi.useFakeTimers();
    const render = (loadingPath: string | null) => (
      <DiffFileTransition identity="a" ready loadingPath={loadingPath}>
        <span>a</span>
      </DiffFileTransition>
    );
    await act(async () => {
      renderer = create(render("b.ts"));
    });
    expect(renderer!.root.findAllByProps({ role: "status" })).toHaveLength(0);
    await act(async () => {
      vi.advanceTimersByTime(150);
    });
    expect(renderer!.root.findByProps({ role: "status" }).children.join("")).toContain("b.ts");
    await act(async () => {
      renderer!.update(render(null));
    });
    expect(renderer!.root.findAllByProps({ role: "status" })).toHaveLength(0);
  });
});
