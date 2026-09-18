import { describe, expect, it } from "vitest";
import { mapCapabilityStatus } from "../src/status/status-mapping.js";

describe("status family mapping", () => {
  it("maps valid+reachable to emerald completed", () => {
    expect(mapCapabilityStatus({ validation: "valid", reachability: "reachable" })).toEqual({
      family: "completed",
      color: "emerald",
    });
  });

  it("maps unverified and offline to amber waiting without a new color", () => {
    expect(mapCapabilityStatus({ validation: "pending_validation", reachability: "unverified" })).toEqual({
      family: "waiting",
      color: "amber",
    });
    expect(mapCapabilityStatus({ connectorOnline: false, reachability: "unverified" })).toEqual({
      family: "waiting",
      color: "amber",
    });
  });

  it("maps invalid and unreachable to red failed", () => {
    expect(mapCapabilityStatus({ validation: "invalid" })).toEqual({
      family: "failed",
      color: "red",
    });
    expect(mapCapabilityStatus({ validation: "valid", reachability: "unreachable" })).toEqual({
      family: "failed",
      color: "red",
    });
  });
});
