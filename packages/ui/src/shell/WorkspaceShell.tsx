import type { PropsWithChildren, ReactNode } from "react";
import { AssistantPanel, type AssistantState } from "./AssistantPanel.js";
import { EntityColumn } from "./EntityColumn.js";
import { NavRail } from "./NavRail.js";
import { TopBar } from "./TopBar.js";

export function WorkspaceShell({
  topBar,
  rail,
  entity,
  assistant,
  assistantState,
  children,
}: PropsWithChildren<{
  topBar: ReactNode;
  rail: ReactNode;
  entity: ReactNode;
  assistant: ReactNode;
  assistantState: AssistantState;
}>) {
  return (
    <div data-adlc-shell="workspace" className="grid h-screen grid-rows-[40px_minmax(0,1fr)] bg-[#0A0B0D] text-[#F1F5F9]">
      <TopBar>{topBar}</TopBar>
      <div className="flex min-h-0 h-full">
        <NavRail>{rail}</NavRail>
        <EntityColumn>{entity}</EntityColumn>
        <main data-adlc-region="main" className="min-w-0 flex-1 overflow-auto bg-[#0A0B0D]">
          {children}
        </main>
        <AssistantPanel state={assistantState}>{assistant}</AssistantPanel>
      </div>
    </div>
  );
}
