import { test, expect } from "@playwright/test";

test("golden-path screens expose labelled controls and keyboard focus", async ({ page }) => {
  await page.goto("/sessions/new");
  const first = page.locator("input, select, button, a").first();
  await first.focus();
  await expect(first).toBeFocused();
  await expect(page.getByRole("main")).toBeVisible();
  await expect(page.getByRole("region", { name: "Readiness blockers" })).toBeVisible();
  await page.keyboard.press("Tab");
  await expect(page.locator(":focus")).toBeVisible();
});
