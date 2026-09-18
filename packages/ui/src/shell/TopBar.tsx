import type { PropsWithChildren } from "react";

export function TopBar({ children }: PropsWithChildren) {
  return (
    <header
      data-adlc-region="top-bar"
      className="col-span-full flex h-10 min-h-10 items-center justify-between gap-3 border-b border-[#1E2129] bg-[#0A0B0D] px-3"
    >
      {children}
    </header>
  );
}
