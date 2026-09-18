import { hostname } from "node:os";
import { registerConnector, runCheckOnce } from "./control-plane/check-loop.js";

const requiredEnvironment = ["ADLC_API_URL", "ADLC_WORKSPACE_PATH"] as const;
const missingVariables = requiredEnvironment.filter((name) => !process.env[name]);

if (missingVariables.length > 0) {
  console.warn(`Workspace connector missing configuration: ${missingVariables.join(", ")}`);
} else {
  const apiUrl = process.env.ADLC_API_URL!;
  const workspacePath = process.env.ADLC_WORKSPACE_PATH!;
  const registrationToken = process.env.ADLC_CONNECTOR_REGISTRATION_TOKEN;

  const start = async () => {
    const registered = registrationToken
      ? await registerConnector({
          apiUrl,
          registrationToken,
          workspacePath,
        })
      : null;
    let connectorId =
      registered?.connectorId ??
      process.env.ADLC_CONNECTOR_ID ??
      "00000000-0000-4000-8000-00000000e002";
    let token = registered?.token ?? process.env.ADLC_CONNECTOR_TOKEN ?? "";
    if (!token) {
      console.warn("Workspace connector has no bearer token after registration.");
      return;
    }

    const tick = async () => {
      const outcome = await runCheckOnce({
        apiUrl,
        connectorId,
        token,
        workspacePath,
      }).catch((error) => {
        const message = error instanceof Error ? error.message : "check loop failed";
        if (!/bearer|credential|authorization/i.test(message)) {
          console.warn("Connector check loop failed", message);
        } else {
          console.warn("Connector check loop failed");
        }
        return "ok" as const;
      });
      if (outcome === "unauthorized" && registrationToken) {
        const again = await registerConnector({
          apiUrl,
          registrationToken,
          workspacePath,
        });
        if (again) {
          connectorId = again.connectorId;
          token = again.token;
        }
      }
    };

    void tick();
    setInterval(() => {
      void tick();
    }, 3_000);
  };

  void start();
}

console.log(`ADLC workspace connector check loop started on ${hostname()}.`);
