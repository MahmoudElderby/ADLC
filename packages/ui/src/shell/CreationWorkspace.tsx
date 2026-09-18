import type { PropsWithChildren } from "react";

export function CreationWorkspace({ children }: PropsWithChildren) {
  return (
    <section
      data-adlc-region="creation-workspace"
      className="adlc-creation-workspace"
    >
      {children}
    </section>
  );
}
