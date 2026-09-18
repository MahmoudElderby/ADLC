import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { type PropsWithChildren, useState } from "react";
import { create } from "zustand";

type WorkspaceState = {
  workspaceId: string;
  actorId: string;
  setWorkspaceId: (workspaceId: string) => void;
};

export const useWorkspaceStore = create<WorkspaceState>((set) => ({
  workspaceId: "00000000-0000-4000-8000-000000000001",
  actorId: "00000000-0000-4000-8000-000000000002",
  setWorkspaceId: (workspaceId) => set({ workspaceId }),
}));

export function AppProviders({ children }: PropsWithChildren) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            retry: 1,
            staleTime: 10_000,
          },
        },
      }),
  );

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
