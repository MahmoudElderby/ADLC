import { type FormEvent, useState } from "react";
import { Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button, Field, I, SectionLabel, SvgIcon, TInput } from "@adlc/ui";
import { currentIdentitySchema } from "@adlc/contracts";
import { apiFetch, apiFetchRaw, ApiRequestError } from "../../lib/api.js";

function safeNext(value: string | null): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return "/skills";
  }
  return value;
}

export function SignInPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [params] = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const existing = useQuery({
    queryKey: ["auth", "me"],
    queryFn: () => apiFetch("/auth/me", currentIdentitySchema),
    retry: false,
  });

  if (existing.data) {
    return <Navigate to={safeNext(params.get("next"))} replace />;
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await apiFetchRaw("/auth/sign-in", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      await queryClient.invalidateQueries({ queryKey: ["auth", "me"] });
      navigate(safeNext(params.get("next")), { replace: true });
    } catch (cause) {
      if (cause instanceof ApiRequestError) {
        setError("Sign-in failed.");
      } else {
        setError("Sign-in failed.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#0A0B0D] px-6 text-[#F1F5F9]">
      <div className="w-full max-w-sm rounded-xl border border-[#1E2129] bg-[#0D0F13] p-6">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-500 to-cyan-700">
            <SvgIcon d={I.command} size={14} className="text-white" />
          </div>
          <div>
            <SectionLabel>ADLC Command Center</SectionLabel>
            <h1 className="text-sm font-semibold text-[#F1F5F9]">Sign in</h1>
          </div>
        </div>
        <form onSubmit={onSubmit} className="grid gap-4">
          <Field label="Email" htmlFor="email" required>
            <TInput
              id="email"
              type="email"
              autoComplete="username"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </Field>
          <Field label="Password" htmlFor="password" required>
            <TInput
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </Field>
          {error ? (
            <p role="alert" className="m-0 text-[11px] text-red-400">
              {error}
            </p>
          ) : null}
          <Button type="submit" variant="primary" disabled={submitting} className="w-full">
            Sign in
          </Button>
        </form>
      </div>
    </main>
  );
}
