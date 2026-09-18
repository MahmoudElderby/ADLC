import { expect, test, type Page } from "@playwright/test";
import { replaceApiProcessOnPort } from "../../packages/test-support/src/api-process.ts";
import { killConnectorProcesses, replaceConnectorProcess } from "../../packages/test-support/src/connector-process.ts";
import {
  SEEDED_PUBLISHED_AGENT_NAME,
  attachCapabilityToSeededAgent,
  createTestPostgres,
} from "../../packages/test-support/src/index.ts";

const operatorEmail = process.env.ADLC_OPERATOR_EMAIL ?? "operator@adlc.local";
const operatorPassword = process.env.ADLC_OPERATOR_PASSWORD ?? "ChangeMeOperatorPass1";

test.describe("Cockpit shell and capability registry", () => {
  test.describe.configure({ mode: "serial" });

  test("demo 1: signed-out visitor is refused with no workspace content", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: /sign in/i })).toBeVisible();
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.locator("[data-adlc-shell='workspace']")).toHaveCount(0);
    await expect(page.getByText(/adlc workspace/i)).toHaveCount(0);
    await expect(page.getByRole("navigation")).toHaveCount(0);
  });

  test("demo 2: signed-out deep link preserves next and discloses nothing", async ({ page }) => {
    await page.goto("/skills/new");
    await expect(page.getByRole("heading", { name: /sign in/i })).toBeVisible();
    await expect(page).toHaveURL(/\/sign-in/);
    expect(page.url()).toMatch(/next=/);
    await expect(page.getByText(/adlc workspace/i)).toHaveCount(0);
    await expect(page.getByRole("form", { name: /create skill/i })).toHaveCount(0);
  });

  test("demo 3-8: sign-in shell, rail, assistant persistence, and sign-out", async ({ page }) => {
    await page.goto("/skills/new");
    await page.getByLabel(/email/i).fill(operatorEmail);
    await page.getByLabel(/password/i).fill(operatorPassword);
    await page.getByRole("button", { name: /sign in/i }).click();

    await expect(page.locator("[data-adlc-shell='workspace']")).toBeVisible();
    await expect(page.locator("[data-adlc-region='top-bar']")).toBeVisible();
    await expect(page.locator("[data-adlc-region='rail']")).toBeVisible();
    await expect(page.locator("[data-adlc-region='entity-column']")).toBeVisible();
    await expect(page.locator("[data-adlc-region='main']")).toBeVisible();
    await expect(page.locator("[data-adlc-region='assistant']")).toBeVisible();
    await expect(page.locator("[data-adlc-region='top-bar']")).toContainText(/operator/i);
    await expect(page.locator("[data-adlc-region='top-bar']")).toContainText(/adlc workspace/i);
    await expect(page.getByTestId("environment-health")).toContainText(
      /online|offline|unable to probe|cannot probe/i,
    );

    const rail = page.locator("[data-adlc-region='rail']");
    await expect(rail.getByRole("link", { name: /skills/i })).toBeVisible();
    await expect(rail.getByRole("link", { name: /mcp/i })).toBeVisible();
    await expect(rail.getByRole("link")).toHaveCount(2);
    await expect(rail.getByRole("link", { name: /command center/i })).toHaveCount(0);
    await expect(rail.getByRole("link", { name: /agents/i })).toHaveCount(0);
    await expect(rail.getByRole("link", { name: /workflows/i })).toHaveCount(0);
    await expect(rail.getByRole("link", { name: /sessions/i })).toHaveCount(0);

    const assistant = page.locator("[data-adlc-region='assistant']");
    await expect(page.getByRole("textbox", { name: /message|composer/i })).toHaveCount(0);
    await rail.getByRole("link", { name: /mcp/i }).click();
    await expect(page).toHaveURL(/\/mcp/);
    await expect(page.locator("[data-adlc-region='entity-column']")).toContainText(/mcp/i);
    await expect(page.locator("[data-adlc-region='main']")).toContainText(/mcp/i);
    await expect(assistant).toBeVisible();
    await rail.getByRole("link", { name: /skills/i }).click();
    await expect(page).toHaveURL(/\/skills/);
    await expect(page.locator("[data-adlc-region='entity-column']")).toContainText(/skill/i);
    await expect(assistant).toBeVisible();

    const mainBox = await page.locator("[data-adlc-region='main']").boundingBox();
    await page.getByRole("button", { name: /collapse assistant/i }).click();
    await expect(assistant).toHaveAttribute("data-adlc-assistant-state", "collapsed");
    const collapsedMain = await page.locator("[data-adlc-region='main']").boundingBox();
    expect(collapsedMain?.width ?? 0).toBeGreaterThan(mainBox?.width ?? 0);

    await page.getByRole("button", { name: /hide assistant/i }).click();
    await expect(page.locator("[data-adlc-region='assistant']")).toHaveCount(0);
    const hiddenMain = await page.locator("[data-adlc-region='main']").boundingBox();
    expect(hiddenMain?.width ?? 0).toBeGreaterThan(collapsedMain?.width ?? 0);

    await page.reload();
    await expect(page).toHaveURL(/\/skills/);
    await expect(page.locator("[data-adlc-region='assistant']")).toHaveCount(0);

    const lastUrl = page.url();
    await page.getByRole("button", { name: /sign out/i }).click();
    await expect(page.getByRole("heading", { name: /sign in/i })).toBeVisible();
    await page.goto(lastUrl);
    await expect(page.getByRole("heading", { name: /sign in/i })).toBeVisible();
    await expect(page.locator("[data-adlc-shell='workspace']")).toHaveCount(0);
  });

  test("demo 9-15: create, validate, edit, and survive an OS API restart", async ({ page }) => {
    const skillName = `durable-skill-${Date.now()}`;
    await page.goto("/skills");
    await page.getByLabel(/email/i).fill(operatorEmail);
    await page.getByLabel(/password/i).fill(operatorPassword);
    await page.getByRole("button", { name: /sign in/i }).click();
    await expect(page.locator("[data-adlc-shell='workspace']")).toBeVisible();

    await page.getByRole("link", { name: "Create skill" }).click();
    const creation = page.locator("[data-adlc-region='creation-workspace']");
    await expect(creation).toBeVisible();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(page.locator("[data-adlc-region='entity-column']")).toBeVisible();
    await expect(page.locator("[data-adlc-region='assistant']")).toBeVisible();

    await creation.getByLabel("Description").fill("Initial durable skill.");
    await creation.getByLabel("Source type").selectOption("source_reference");
    await creation.getByLabel("Source reference").fill("skills/durable");
    await creation.getByLabel("Version").fill("1.0.0");
    await creation.getByRole("button", { name: /save skill/i }).click();
    await expect(creation.getByTestId("skill-blocking-errors")).toContainText(/name/i);

    await expect(creation.getByTestId("skill-blocking-errors")).toHaveAttribute(
      "data-severity",
      "blocking",
    );
    await expect(creation.getByTestId("skill-warnings")).toHaveAttribute("data-severity", "warning");
    const blockingColor = await creation
      .getByTestId("skill-blocking-errors")
      .evaluate((element) => getComputedStyle(element).color);
    const warningColor = await creation
      .getByTestId("skill-warnings")
      .evaluate((element) => getComputedStyle(element).color);
    expect(blockingColor).not.toBe(warningColor);

    await creation.getByLabel("Name", { exact: true }).fill(skillName);
    await expect(creation.getByTestId("skill-configuration-preview")).toContainText(skillName);
    await expect(creation.getByTestId("skill-configuration-preview")).toHaveClass(/adlc-machine/);

    await creation.getByRole("button", { name: /save skill/i }).click();
    const entity = page.locator("[data-adlc-region='entity-column']");
    const skillLink = entity.getByRole("link", { name: skillName });
    await expect(skillLink).toBeVisible();
    await expect(skillLink.getByTestId("skill-status")).toBeVisible();

    await skillLink.click();
    await expect(page).toHaveURL(/\/skills\/[0-9a-f-]{36}/i);
    const main = page.locator("[data-adlc-region='main']");
    await expect(main.getByRole("heading", { name: skillName })).toBeVisible();
    await expect(main.getByTestId("skill-attribution")).toContainText(/operator/i);
    await expect(main.getByTestId("skill-history")).toContainText(/registered/i);
    const firstHistory = await main.getByTestId("skill-history").locator("li").first().innerText();

    await main.getByLabel("Description").fill("Edited after first save.");
    await main.getByRole("button", { name: /save skill/i }).click();
    await expect(main.getByTestId("skill-history")).toContainText(/updated/i);
    await expect(main.getByTestId("skill-history").locator("li").first()).toHaveText(firstHistory);
    await expect(main.getByTestId("skill-history").locator("li")).toHaveCount(2);

    const databaseUrl =
      process.env.DATABASE_URL ?? "postgres://adlc:adlc_dev_password@localhost:5432/adlc";
    const port = Number(process.env.API_PORT ?? 3000);
    await replaceApiProcessOnPort({ databaseUrl, port, host: "127.0.0.1" });

    await page.getByRole("button", { name: /sign out/i }).click();
    await expect(page.getByRole("heading", { name: /sign in/i })).toBeVisible();
    await page.getByLabel(/email/i).fill(operatorEmail);
    await page.getByLabel(/password/i).fill(operatorPassword);
    await page.getByRole("button", { name: /sign in/i }).click();
    await expect(page.locator("[data-adlc-shell='workspace']")).toBeVisible();
    await page.getByRole("link", { name: skillName }).click();
    await expect(page.locator("[data-adlc-region='main']").getByLabel("Description")).toHaveValue(
      "Edited after first save.",
    );
    await expect(page.getByTestId("skill-history")).toContainText(/registered/i);
    await expect(page.getByTestId("skill-history")).toContainText(/updated/i);
    await expect(page.getByTestId("skill-attribution")).toContainText(/operator/i);
    await expect(page.getByTestId("skill-history").locator("li")).toHaveCount(2);
  });

  test("demo 16-24: MCP secrets, reachability, and delete-guard", async ({ page }) => {
    const credential = "test-mcp-credential";
    const privateLabel = `private-mcp-${Date.now()}`;
    const unreachableLabel = `dead-mcp-${Date.now()}`;
    const offlineLabel = `offline-mcp-${Date.now()}`;
    const capturedBodies: string[] = [];

    page.on("response", async (response) => {
      if (!response.url().includes("/api/")) {
        return;
      }
      try {
        capturedBodies.push(await response.text());
      } catch {
        // ignore non-text bodies
      }
    });

    await signInAsOperator(page);
    await page.locator("[data-adlc-region='rail']").getByRole("link", { name: /mcp/i }).click();
    await expect(page).toHaveURL(/\/mcp/);
    await page.getByRole("link", { name: "Create MCP server" }).click();
    const creation = page.locator("[data-adlc-region='creation-workspace']");
    await expect(creation).toBeVisible();
    await expect(page.getByRole("dialog")).toHaveCount(0);

    await fillMcpForm(creation, {
      label: privateLabel,
      serverUrl: "http://127.0.0.1:18080/mcp",
      allowedTools: "search",
      credential,
    });
    await expect(creation.getByTestId("mcp-configuration-preview")).toContainText(privateLabel);
    await expect(creation.getByTestId("mcp-configuration-preview")).not.toContainText(credential);
    await creation.getByRole("button", { name: /save mcp/i }).click();

    const entity = page.locator("[data-adlc-region='entity-column']");
    const privateLink = entity.getByRole("link", { name: privateLabel });
    await expect(privateLink).toBeVisible();
    await expect(privateLink.getByTestId("mcp-status")).toBeVisible();
    await expect(privateLink.getByTestId("mcp-status")).toContainText(/reachable/i, {
      timeout: 45_000,
    });

    await privateLink.click();
    const main = page.locator("[data-adlc-region='main']");
    await expect(main.getByRole("heading", { name: privateLabel })).toBeVisible();
    await expect(main.getByTestId("mcp-credential-reference")).toBeVisible();
    await expect(main.getByTestId("mcp-credential-reference")).not.toContainText(credential);
    await expect(page.locator("body")).not.toContainText(credential);
    await expect(main.getByTestId("mcp-attribution")).toContainText(/operator/i);
    await expect(main.getByTestId("mcp-history")).toContainText(/registered/i);
    expect(capturedBodies.some((body) => body.includes(credential))).toBe(false);

    await page.getByRole("link", { name: "Create MCP server" }).click();
    await fillMcpForm(page.locator("[data-adlc-region='creation-workspace']"), {
      label: privateLabel,
      serverUrl: "http://127.0.0.1:18080/mcp",
      allowedTools: "search",
      credential,
    });
    await page
      .locator("[data-adlc-region='creation-workspace']")
      .getByRole("button", { name: /save mcp/i })
      .click();
    await expect(page.getByRole("alert")).toContainText(/label|unique|conflict/i);

    await page.getByRole("link", { name: "Create MCP server" }).click();
    await fillMcpForm(page.locator("[data-adlc-region='creation-workspace']"), {
      label: unreachableLabel,
      serverUrl: "http://127.0.0.1:9/mcp",
      allowedTools: "search",
      credential,
    });
    await page
      .locator("[data-adlc-region='creation-workspace']")
      .getByRole("button", { name: /save mcp/i })
      .click();
    const unreachableLink = entity.getByRole("link", { name: unreachableLabel });
    await expect(unreachableLink).toBeVisible();
    await expect(unreachableLink.getByTestId("mcp-status")).toContainText(/unreachable|unhealthy/i, {
      timeout: 45_000,
    });

    await killConnectorProcesses();
    await page.reload();
    await expect(page.locator("[data-adlc-shell='workspace']")).toBeVisible();
    await expect(page.getByTestId("environment-health")).toContainText(
      /offline|unable to probe|cannot probe/i,
      { timeout: 60_000 },
    );

    await page.getByRole("link", { name: "Create MCP server" }).click();
    await fillMcpForm(page.locator("[data-adlc-region='creation-workspace']"), {
      label: offlineLabel,
      serverUrl: "http://127.0.0.1:18080/mcp",
      allowedTools: "search",
      credential,
    });
    await page
      .locator("[data-adlc-region='creation-workspace']")
      .getByRole("button", { name: /save mcp/i })
      .click();
    const offlineLink = entity.getByRole("link", { name: offlineLabel });
    await expect(offlineLink).toBeVisible();
    await expect(offlineLink.getByTestId("mcp-status")).toContainText(/unverified/i);
    await offlineLink.click();
    await expect(page.locator("[data-adlc-region='main']")).toContainText(
      /unverified|connector|offline|probe/i,
    );

    await replaceConnectorProcess();
    await page.reload();
    await expect(page.locator("[data-adlc-shell='workspace']")).toBeVisible();
    await expect(page.getByTestId("environment-health")).toContainText(/online/i, {
      timeout: 45_000,
    });
    await page.getByRole("link", { name: offlineLabel }).click();
    await page.getByRole("button", { name: /revalidate/i }).click();
    await expect(
      page.locator("[data-adlc-region='main']").getByTestId("mcp-status"),
    ).toContainText(/reachable|unreachable/i, {
      timeout: 45_000,
    });

    const mcpId = page.url().match(/\/mcp\/([0-9a-f-]{36})/i)?.[1];
    expect(mcpId).toBeTruthy();
    const workspaceName = process.env.ADLC_WORKSPACE_NAME ?? "ADLC workspace";
    const postgres = createTestPostgres(
      process.env.DATABASE_URL ?? "postgres://adlc:adlc_dev_password@localhost:5432/adlc",
    );
    const agentRows = await postgres.query<{ id: string }>(
      `SELECT a.id
         FROM agents a
         INNER JOIN workspaces w ON w.id = a.workspace_id
        WHERE a.name = $1 AND w.name = $2
        LIMIT 1`,
      [SEEDED_PUBLISHED_AGENT_NAME, workspaceName],
    );
    const privateRows = await postgres.query<{ id: string }>(
      "SELECT id FROM mcp_servers WHERE label = $1 LIMIT 1",
      [privateLabel],
    );
    expect(agentRows.rows[0]?.id).toBeTruthy();
    expect(privateRows.rows[0]?.id).toBeTruthy();
    await attachCapabilityToSeededAgent(postgres, {
      agentId: agentRows.rows[0].id,
      capabilityType: "mcp_server",
      capabilityId: privateRows.rows[0].id,
    });

    await page.getByRole("link", { name: privateLabel }).click();
    await page.getByRole("button", { name: /delete mcp/i }).click();
    await expect(page.getByTestId("mcp-delete-error")).toContainText(/seeded published agent/i, {
      timeout: 15_000,
    });
    await expect(page.getByRole("link", { name: privateLabel })).toBeVisible();
    expect(capturedBodies.some((body) => body.includes(credential))).toBe(false);
  });

  test("keyboard, focus, and contrast on sign-in and creation workspaces", async ({ page }) => {
    await page.goto("/sign-in");
    await page.keyboard.press("Tab");
    await expect(page.getByLabel(/email/i)).toBeFocused();
    await page.getByLabel(/email/i).fill(operatorEmail);
    await page.getByLabel(/password/i).fill(operatorPassword);
    await page.getByRole("button", { name: /sign in/i }).click();
    await expect(page.locator("[data-adlc-shell='workspace']")).toBeVisible();

    await page.getByRole("link", { name: "Create skill" }).click();
    const creation = page.locator("[data-adlc-region='creation-workspace']");
    await creation.getByLabel("Name", { exact: true }).focus();
    await expect(creation.getByLabel("Name", { exact: true })).toBeFocused();
    const nameColor = await creation.getByLabel("Name", { exact: true }).evaluate((element) => {
      const styles = getComputedStyle(element);
      return { color: styles.color, background: styles.backgroundColor };
    });
    expect(nameColor.color).not.toBe(nameColor.background);

    await page.locator("[data-adlc-region='rail']").getByRole("link", { name: /mcp/i }).click();
    await page.getByRole("link", { name: "Create MCP server" }).click();
    const mcpCreation = page.locator("[data-adlc-region='creation-workspace']");
    await mcpCreation.getByLabel("Label", { exact: true }).focus();
    await expect(mcpCreation.getByLabel("Label", { exact: true })).toBeFocused();
    const blocking = mcpCreation.getByTestId("mcp-blocking-errors");
    await expect(blocking).toBeVisible();
    const blockingColor = await blocking.evaluate((element) => getComputedStyle(element).color);
    expect(blockingColor).not.toBe("rgb(0, 0, 0)");
  });
});

async function signInAsOperator(page: Page) {
  await page.goto("/mcp");
  const signInHeading = page.getByRole("heading", { name: /sign in/i });
  const shell = page.locator("[data-adlc-shell='workspace']");
  await expect(signInHeading.or(shell)).toBeVisible();
  if (await signInHeading.isVisible()) {
    await page.getByLabel(/email/i).fill(operatorEmail);
    await page.getByLabel(/password/i).fill(operatorPassword);
    await page.getByRole("button", { name: /sign in/i }).click();
  }
  await expect(shell).toBeVisible();
}

async function fillMcpForm(
  root: ReturnType<Page["locator"]>,
  input: { label: string; serverUrl: string; allowedTools: string; credential: string },
) {
  await root.getByLabel("Label", { exact: true }).fill(input.label);
  await root.getByLabel("Server URL").fill(input.serverUrl);
  await root.getByLabel("Allowed tools").fill(input.allowedTools);
  await root.getByLabel("Connection origin").selectOption("environment");
  await root.getByLabel("Required").check();
  await root.getByLabel("Credential").fill(input.credential);
}
