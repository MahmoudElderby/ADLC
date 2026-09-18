import "reflect-metadata";
import cookie from "@fastify/cookie";
import { NestFactory } from "@nestjs/core";
import { FastifyAdapter, type NestFastifyApplication } from "@nestjs/platform-fastify";
import { AppModule } from "./app.module.js";
import { loadApiConfig } from "./platform/config/config.js";
import { configureHttpHardening } from "./platform/security/http-hardening.js";

async function bootstrap() {
  const config = loadApiConfig();
  const adapter = new FastifyAdapter({
    logger: {
      level: process.env.LOG_LEVEL ?? "info",
      redact: [
        "req.headers.authorization",
        "req.headers.cookie",
        "*.token",
        "*.secret",
        "*.apiKey",
        "*.password",
      ],
    },
    bodyLimit: 1_048_576,
    requestTimeout: 30_000,
  });
  const app = await NestFactory.create<NestFastifyApplication>(AppModule, adapter);
  await app.register(cookie);

  app.enableCors({
    origin: process.env.WEB_ORIGIN ?? "http://localhost:5173",
    credentials: true,
  });
  configureHttpHardening(adapter);

  app.setGlobalPrefix("api/v1");

  await app.listen({ host: process.env.HOST ?? "0.0.0.0", port: config.port });
}

void bootstrap();
