import type { PropsWithChildren } from "react";

export function NavRail({ children }: PropsWithChildren) {
  return (
    <nav
      data-adlc-region="rail"
      className="flex w-14 min-w-14 flex-col items-center gap-1 border-r border-[#1E2129] bg-[#0D0F13] py-2"
    >
      {children}
    </nav>
  );
}

export function navRailItemClassName(active: boolean): string {
  return [
    "flex h-10 w-10 items-center justify-center rounded-lg transition-colors no-underline",
    active ? "bg-[#1A1D24] text-[#06B6D4]" : "text-[#4A5568] hover:bg-[#13151A] hover:text-[#8892A4]",
  ].join(" ");
}
