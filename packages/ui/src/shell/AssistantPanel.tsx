import type { PropsWithChildren } from "react";

export type AssistantState = "expanded" | "collapsed" | "hidden";

export function AssistantPanel({
  state,
  children,
}: PropsWithChildren<{ state: AssistantState }>) {
  if (state === "hidden") {
    return null;
  }
  return (
    <aside
      data-adlc-region="assistant"
      data-adlc-assistant-state={state}
      className={`overflow-hidden border-l border-[#1E2129] bg-[#0D0F13] ${
        state === "expanded" ? "w-80 min-w-80" : "w-10 min-w-10"
      }`}
    >
      {children}
    </aside>
  );
}
