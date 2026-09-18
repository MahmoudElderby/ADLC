import { describe, expect, it } from "vitest";
import {
  allowRequest,
  configureHttpHardening,
} from "../../src/platform/security/http-hardening.js";
import type { FastifyAdapter } from "@nestjs/platform-fastify";

type TestReply = {
  header: (name: string, value: string) => TestReply;
  code: (status: number) => TestReply;
  send: (body: unknown) => unknown;
};
import { assertAllowedControlPlaneUrl } from "../../../workspace-connector/src/security/network-policy.js";

describe("production hardening policies", () => {
  it("limits repeated requests inside a window and resets after it", () => {
    let state = undefined;
    for (let index = 0; index < 120; index += 1)
      state = allowRequest(state, 1_000, 120, 60_000).state;
    expect(allowRequest(state, 1_000, 120, 60_000).allowed).toBe(false);
    expect(allowRequest(state, 61_001, 120, 60_000).allowed).toBe(true);
  });

  it("requires HTTPS for connector control-plane URLs", () => {
    expect(assertAllowedControlPlaneUrl("https://control.example.test").protocol).toBe("https:");
    expect(() => assertAllowedControlPlaneUrl("http://control.example.test")).toThrow("HTTPS");
    expect(assertAllowedControlPlaneUrl("http://localhost:3000").hostname).toBe("localhost");
    expect(assertAllowedControlPlaneUrl("http://127.0.0.1:3000").hostname).toBe("127.0.0.1");
    expect(() => assertAllowedControlPlaneUrl("ftp://localhost:3000")).toThrow("HTTPS");
  });

  it("returns the rate-limit response so the handler chain cannot continue", async () => {
    let onRequest: ((request: { ip: string }, reply: TestReply) => Promise<unknown>) | undefined;
    const adapter = {
      getInstance: () => ({
        addHook: (_name: string, hook: typeof onRequest) => {
          onRequest = hook;
        },
      }),
    } as unknown as FastifyAdapter;
    configureHttpHardening(adapter);
    const reply = {
      header: () => reply,
      code: (status: number) => {
        expect(status).toBe(429);
        return reply;
      },
      send: (body: unknown) => {
        expect(body).toEqual({ type: "about:blank", title: "Too Many Requests", status: 429 });
        return "sent";
      },
    };
    expect(onRequest).toBeDefined();
    for (let index = 0; index < 120; index += 1) {
      await onRequest?.({ ip: "127.0.0.2" }, reply);
    }
    await expect(onRequest?.({ ip: "127.0.0.2" }, reply)).resolves.toBe("sent");
  });
});
