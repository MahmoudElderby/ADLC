import type { PropsWithChildren } from "react";

export function EntityColumn({ children }: PropsWithChildren) {
  return (
    <aside
      data-adlc-region="entity-column"
      className="flex w-[260px] min-w-[260px] flex-col overflow-auto border-r border-[#1E2129] bg-[#0D0F13]"
    >
      {children}
    </aside>
  );
}
