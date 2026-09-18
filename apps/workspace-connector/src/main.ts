const requiredEnvironment = [
  "ADLC_API_URL",
  "ADLC_CONNECTOR_TOKEN",
  "ADLC_WORKSPACE_PATH",
] as const;

const missingVariables = requiredEnvironment.filter((name) => !process.env[name]);

if (missingVariables.length > 0) {
  console.warn(`Workspace connector missing configuration: ${missingVariables.join(", ")}`);
}

console.log("ADLC workspace connector scaffold ready.");
