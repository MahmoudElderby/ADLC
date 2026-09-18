import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { FastifyAdapter, type NestFastifyApplication } from "@nestjs/platform-fastify";
import { AppModule } from "./app.module.js";
import { configureHttpHardening } from "./platform/security/http-hardening.js";

const port = Number(process.env.PORT ?? 3000);
const host = process.env.HOST ?? "0.0.0.0";

async function bootstrap() {
  const adapter = new FastifyAdapter({
    logger: {
      level: process.env.LOG_LEVEL ?? "info",
      redact: [
        "req.headers.authorization",
        "req.headers.cookie",
        "*.token",
        "*.secret",
        "*.apiKey",
      ],
    },
    bodyLimit: 1_048_576,
    requestTimeout: 30_000,
  });
  const app = await NestFactory.create<NestFastifyApplication>(AppModule, adapter);

  app.enableCors({ origin: process.env.WEB_ORIGIN ?? "http://localhost:5173", credentials: false });
  configureHttpHardening(adapter);

  app.setGlobalPrefix("api/v1");

  await app.listen({ host, port });
}

void bootstrap();
