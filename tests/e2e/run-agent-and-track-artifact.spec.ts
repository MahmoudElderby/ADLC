import { expect, test } from "./fixtures.js";

test("starts a published agent, observes progress, cancels, and opens artifact provenance", async ({
  page,
}) => {
  await page.goto("/sessions/new");
  await expect(page.getByRole("heading", { name: "Start Session" })).toBeVisible();
  await expect(page.getByLabel("Published agent")).toContainText("Release planner");
  await page.getByLabel("Initial task").fill("Create artifacts/walking-skeleton.md");
  await page.getByRole("button", { name: "Start session" }).click();

  await expect(page.getByRole("heading", { name: "Session Detail" })).toBeVisible();
  await expect(page.getByLabel("Session progress")).toContainText("Running");
  await expect(page.getByLabel("Session progress")).toContainText("Completed");
  await page.getByRole("button", { name: "Open artifact" }).click();
  await expect(page.getByLabel("Artifact provenance")).toContainText("walking-skeleton.md");
  await expect(page.getByLabel("Artifact provenance")).toContainText("Release planner");

  await page.goto("/sessions/new");
  await page.getByLabel("Initial task").fill("Long running task");
  await page.getByRole("button", { name: "Start session" }).click();
  await page.getByRole("button", { name: "Cancel session" }).click();
  await expect(page.getByLabel("Terminal outcome")).toContainText("Canceled");
});
