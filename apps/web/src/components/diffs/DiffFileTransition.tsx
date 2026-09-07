import { useEffect, useState, type ReactNode } from "react";

function LoadingFileNotice({ path }: { path: string }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), 150);
    return () => clearTimeout(timer);
  }, []);
  if (!visible) return null;
  return (
    <div
      role="status"
      className="pointer-events-none absolute top-2 right-3 z-10 max-w-[80%] truncate rounded-md border border-border bg-background px-2 py-1 text-[11px] text-muted-foreground shadow-sm"
    >
      Loading {path}…
    </div>
  );
}

export function DiffFileTransition({
  identity,
  ready,
  loadingPath,
  disableInteraction = loadingPath !== null,
  children,
}: {
  identity: string;
  ready: boolean;
  loadingPath: string | null;
  disableInteraction?: boolean;
  children: ReactNode;
}) {
  const [displayed, setDisplayed] = useState<{ identity: string; children: ReactNode } | null>(
    null,
  );
  if (ready && displayed?.children !== children) {
    setDisplayed({ identity, children });
  }
  const outgoing = !ready && displayed?.identity !== identity ? displayed : null;
  const layers = outgoing ? [outgoing, { identity, children }] : [{ identity, children }];
  return (
    <div className="relative flex min-h-0 flex-1" aria-busy={loadingPath !== null}>
      {layers.map((layer) => {
        const incoming = layer.identity === identity;
        return (
          <div
            key={layer.identity}
            className="absolute inset-0 flex min-h-0 flex-col"
            style={{ visibility: incoming && !ready ? "hidden" : "visible" }}
            inert={!incoming || disableInteraction}
            aria-hidden={!incoming || !ready || undefined}
          >
            {layer.children}
          </div>
        );
      })}
      {loadingPath !== null ? <LoadingFileNotice key={loadingPath} path={loadingPath} /> : null}
    </div>
  );
}
