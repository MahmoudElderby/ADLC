import { useEffect, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { currentIdentitySchema } from "@adlc/contracts";
import { Navigate, useLocation } from "react-router-dom";
import { apiFetch, ApiRequestError } from "../lib/api.js";
import { useIdentityStore } from "./providers.js";

export function AuthGate({ children }: { children: ReactNode }) {
  const location = useLocation();
  const setIdentity = useIdentityStore((state) => state.setIdentity);
  const identityQuery = useQuery({
    queryKey: ["auth", "me"],
    queryFn: () => apiFetch("/auth/me", currentIdentitySchema),
    retry: false,
  });

  useEffect(() => {
    if (identityQuery.data) {
      setIdentity(identityQuery.data);
    } else if (identityQuery.isError) {
      setIdentity(null);
    }
  }, [identityQuery.data, identityQuery.isError, setIdentity]);

  if (identityQuery.isPending) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#0A0B0D]">
        <p className="text-[13px] text-[#4A5568]">Loading session…</p>
      </main>
    );
  }

  if (identityQuery.isError) {
    const status = identityQuery.error instanceof ApiRequestError ? identityQuery.error.status : 0;
    if (status === 401 || status === 403) {
      const next = `${location.pathname}${location.search}`;
      return <Navigate to={`/sign-in?next=${encodeURIComponent(next)}`} replace />;
    }
    return (
      <main role="alert" className="flex min-h-screen flex-col items-center justify-center bg-[#0A0B0D] text-[#F1F5F9]">
        <h1 className="text-sm font-semibold">Unable to load session</h1>
        <p className="mt-2 text-[13px] text-[#8892A4]">Sign in is required.</p>
      </main>
    );
  }

  return <>{children}</>;
}
