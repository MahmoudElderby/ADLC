import { expect, test } from "./fixtures.js";

test("registers capabilities and prepares an agent for publish review", async ({ page }) => {
  await page.goto("/capabilities");
  await page.getByRole("button", { name: "Register skill" }).click();
  await page.getByRole("button", { name: "Register MCP" }).click();
  await expect(page.getByRole("heading", { name: "planning-skill" })).toBeVisible();
  await expect(page.getByText("environment")).toBeVisible();
  await expect(page.getByText("replace-with")).toHaveCount(0);

  await page.goto("/agents/new");
  await expect(page.getByRole("heading", { name: "Agent Draft" })).toBeVisible();
  await expect(page.getByLabel("Agent review")).toContainText("always_allow");
  await expect(page.getByLabel("Blocking errors")).toContainText("Attach one valid skill");
});
