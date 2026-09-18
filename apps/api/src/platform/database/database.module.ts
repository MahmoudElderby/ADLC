import { Global, Inject, Module, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import { schema } from "@adlc/database";
import { PlatformSecurityModule } from "../security/platform-security.module.js";
import { WorkspaceBootstrap } from "./workspace-bootstrap.js";
import { DATABASE, DATABASE_POOL } from "./database.tokens.js";

export { DATABASE, DATABASE_POOL, type Database } from "./database.tokens.js";
import type { Database } from "./database.tokens.js";

export async function inTransaction<T>(
  database: Database,
  work: (tx: Database) => Promise<T>,
): Promise<T> {
  return database.transaction((tx) => work(tx as Database));
}

@Global()
@Module({
  imports: [PlatformSecurityModule],
  providers: [
    {
      provide: DATABASE_POOL,
      useFactory: () =>
        new pg.Pool({
          connectionString:
            process.env.DATABASE_URL ?? "postgres://adlc:adlc_dev_password@localhost:5432/adlc",
        }),
    },
    {
      provide: DATABASE,
      inject: [DATABASE_POOL],
      useFactory: (pool: pg.Pool) => drizzle(pool, { schema }),
    },
    WorkspaceBootstrap,
  ],
  exports: [DATABASE_POOL, DATABASE, WorkspaceBootstrap],
})
export class DatabaseModule implements OnModuleInit, OnModuleDestroy {
  constructor(
    @Inject(WorkspaceBootstrap) private readonly bootstrap: WorkspaceBootstrap,
    @Inject(DATABASE_POOL) private readonly pool: pg.Pool,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.bootstrap.ensurePlatformWorkspace();
  }

  async onModuleDestroy(): Promise<void> {
    await this.pool.end();
  }
}
