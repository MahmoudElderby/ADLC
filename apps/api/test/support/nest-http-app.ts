import cookie from "@fastify/cookie";
import { NestFactory } from "@nestjs/core";
import { FastifyAdapter, type NestFastifyApplication } from "@nestjs/platform-fastify";
import { getSharedTestPostgres } from "@adlc/test-support";
import { expect } from "vitest";
import { AppModule } from "../../src/app.module.js";

export async function createNestHttpApp(): Promise<NestFastifyApplication> {
  const postgres = await getSharedTestPostgres();
  process.env.DATABASE_URL = postgres.connectionString;
  process.env.TEST_DATABASE_URL = postgres.connectionString;

  const adapter = new FastifyAdapter({ logger: false });
  try {
    const app = await NestFactory.create<NestFastifyApplication>(AppModule, adapter, {
      logger: ["error"],
    });
    await app.register(cookie);
    app.setGlobalPrefix("api/v1");
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
    return app;
  } catch (error) {
    console.error("createNestHttpApp failed", error);
    throw error;
  }
}

export async function closeNestHttpApp(app: NestFastifyApplication): Promise<void> {
  await app.close();
}

export function cookieHeader(setCookie: string | string[] | undefined, name = "adlc_session"): string | undefined {
  const values = setCookie === undefined ? [] : Array.isArray(setCookie) ? setCookie : [setCookie];
  for (const header of values) {
    const match = header.match(new RegExp(`(?:^|,\\s*)${name}=([^;]+)`));
    if (match?.[1]) {
      return `${name}=${match[1]}`;
    }
  }
  return undefined;
}

export function assertNoWorkspaceDisclosure(body: unknown): void {
  const text = JSON.stringify(body).toLowerCase();
  expect(text).not.toContain("adlc workspace");
  expect(text).not.toContain("skills");
  expect(text).not.toMatch(/"items"\s*:/);
  expect(text).not.toContain("operator@adlc.local");
  expect(text).not.toContain("password_hash");
  expect(text).not.toContain("token_hash");
}
