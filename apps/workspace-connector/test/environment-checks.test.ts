import { afterEach, describe, expect, it, vi } from "vitest";
import {
  TEST_MCP_DEFAULT_CREDENTIAL,
  startTestMcpServer,
} from "@adlc/test-support";
import { handshakeMcp } from "../src/health/mcp-handshake.js";
import { assertAllowedCheck, runCheckOnce } from "../src/control-plane/check-loop.js";

describe("connector environment checks", () => {
  const logs: string[] = [];
  const originalLog = console.log;
  const originalWarn = console.warn;

  afterEach(() => {
    console.log = originalLog;
    console.warn = originalWarn;
    logs.length = 0;
  });

  function captureLogs() {
    const push = (...args: unknown[]) => {
      logs.push(args.map(String).join(" "));
    };
    console.log = push;
    console.warn = push;
  }

  it("performs Streamable HTTP initialize then tools/list and ignores HTTP ping", async () => {
    const server = await startTestMcpServer({ mode: "tools", tools: ["search"] });
    try {
      const ping = await fetch(server.url, { method: "GET" });
      expect(ping.status).toBe(200);

      captureLogs();
      const result = await handshakeMcp({
        serverUrl: server.url,
        allowedTools: ["search"],
        credential: TEST_MCP_DEFAULT_CREDENTIAL,
      });
      expect(result.handshake).toBe("accepted");
      expect(result.allowedToolsPresent).toBe(true);
      expect(result.reachability).toBe("reachable");
      expect(logs.join("\n")).not.toContain(TEST_MCP_DEFAULT_CREDENTIAL);
      expect(logs.join("\n").toLowerCase()).not.toContain("bearer ");
    } finally {
      await server.close();
    }
  });

  it("maps auth failure and missing allowed tools without logging secrets", async () => {
    const tools = await startTestMcpServer({ mode: "tools", tools: ["search"] });
    const none = await startTestMcpServer({ mode: "none" });
    try {
      captureLogs();
      const unauthorized = await handshakeMcp({
        serverUrl: tools.url,
        allowedTools: ["search"],
        credential: "wrong-credential",
      });
      expect(unauthorized.reachability).toBe("unreachable");
      expect(unauthorized.handshake).toBe("rejected");

      const missingTools = await handshakeMcp({
        serverUrl: none.url,
        allowedTools: ["search"],
        credential: TEST_MCP_DEFAULT_CREDENTIAL,
      });
      expect(missingTools.handshake).toBe("accepted");
      expect(missingTools.allowedToolsPresent).toBe(false);
      expect(missingTools.reachability).toBe("unreachable");
      expect(logs.join("\n")).not.toContain("wrong-credential");
      expect(logs.join("\n")).not.toContain(TEST_MCP_DEFAULT_CREDENTIAL);
    } finally {
      await tools.close();
      await none.close();
    }
  });

  it("rejects disallowed check types and exec-like payloads", () => {
    expect(() =>
      assertAllowedCheck({
        checkId: "00000000-0000-4000-8000-00000000c001",
        type: "start_executor",
        expiresAt: new Date(Date.now() + 10_000).toISOString(),
      }),
    ).toThrow();
    expect(() =>
      assertAllowedCheck({
        checkId: "00000000-0000-4000-8000-00000000c002",
        type: "mcp_reachability",
        expiresAt: new Date(Date.now() + 10_000).toISOString(),
        exec: "rm -rf /",
      }),
    ).toThrow();
    expect(() =>
      assertAllowedCheck({
        checkId: "00000000-0000-4000-8000-00000000c003",
        type: "mcp_reachability",
        expiresAt: new Date(Date.now() - 1_000).toISOString(),
      }),
    ).toThrow(/expir/i);
  });

  it("does not poll commands/next as part of the 002 check loop", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(null, { status: 204 }),
    );
    try {
      await runCheckOnce({
        apiUrl: "http://127.0.0.1:3000",
        connectorId: "00000000-0000-4000-8000-00000000e002",
        token: "connector-token",
        workspacePath: "C:/tmp/adlc-workspace",
      });
      const urls = fetchSpy.mock.calls.map((call) => String(call[0]));
      expect(urls.some((url) => url.includes("/heartbeat"))).toBe(true);
      expect(urls.some((url) => url.includes("/checks/next"))).toBe(true);
      expect(urls.some((url) => url.includes("/commands/next"))).toBe(false);
    } finally {
      fetchSpy.mockRestore();
    }
  });
});
