import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/schema/**/*.ts",
  out: "./drizzle",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "postgres://adlc:adlc_dev_password@localhost:5432/adlc",
  },
  strict: true,
  verbose: true,
});
