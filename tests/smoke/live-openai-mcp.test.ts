import { describe, expect, it } from "vitest";

describe("live OpenAI and VPN MCP smoke", () => {
  it.skipIf(process.env.ADLC_LIVE_SMOKE !== "1")(
    "creates one Markdown artifact without approval requests or credential persistence",
    () => {
      expect(process.env.OPENAI_API_KEY).toBeTruthy();
      expect(process.env.ADLC_MCP_URL).toBeTruthy();
      expect(process.env.ADLC_SMOKE_ARTIFACT_PATH?.toLowerCase()).toMatch(/\.md$/);
    },
  );
});
