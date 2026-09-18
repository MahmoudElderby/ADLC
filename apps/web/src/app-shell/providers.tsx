import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { type PropsWithChildren, useState } from "react";
import { create } from "zustand";
import type { CurrentIdentity } from "@adlc/contracts";
import { ApiRequestError } from "../lib/api.js";

type IdentityState = {
  identity: CurrentIdentity | null;
  setIdentity: (identity: CurrentIdentity | null) => void;
};

export const useIdentityStore = create<IdentityState>((set) => ({
  identity: null,
  setIdentity: (identity) => set({ identity }),
}));

export const useWorkspaceStore = useIdentityStore;

export function AppProviders({ children }: PropsWithChildren) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            retry: (failureCount, error) => {
              if (error instanceof ApiRequestError && (error.status === 401 || error.status === 403)) {
                return false;
              }
              return failureCount < 1;
            },
            staleTime: 10_000,
          },
          mutations: {
            retry: false,
          },
        },
      }),
  );

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
