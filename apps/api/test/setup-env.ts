import "reflect-metadata";

process.env.ADLC_OPERATOR_EMAIL ??= "operator@adlc.local";
process.env.ADLC_OPERATOR_PASSWORD ??= "ChangeMeOperatorPass1";
process.env.ADLC_OPERATOR_DISPLAY_NAME ??= "Operator";
process.env.ADLC_WORKSPACE_NAME ??= "ADLC workspace";
process.env.ADLC_CONNECTOR_REGISTRATION_TOKEN ??= "replace-with-registration-secret-min-24";
process.env.ADLC_CONNECTOR_TOKEN ??= "replace-with-one-time-connector-token-min-24";
process.env.ADLC_SESSION_IDLE_SECONDS ??= "28800";
process.env.ADLC_SESSION_ABSOLUTE_SECONDS ??= "86400";
process.env.OPENAI_API_KEY ??= "test-openai-key";
process.env.SECRET_ENCRYPTION_KEY ??= "ci-secret-encryption-key-32-bytes";
