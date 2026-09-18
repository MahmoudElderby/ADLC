import { SESSION_ABSOLUTE_SECONDS_DEFAULT, SESSION_COOKIE_NAME } from "../auth/session-policy.js";

export { SESSION_COOKIE_NAME };

export type SessionCookieOptions = {
  httpOnly: true;
  sameSite: "lax";
  path: "/";
  secure: boolean;
  maxAge: number;
};

export function sessionCookieOptions(
  nodeEnv = process.env.NODE_ENV ?? "development",
  maxAgeSeconds = SESSION_ABSOLUTE_SECONDS_DEFAULT,
): SessionCookieOptions {
  return {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: nodeEnv === "production",
    maxAge: maxAgeSeconds,
  };
}
