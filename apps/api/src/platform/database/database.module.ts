import { Global, Module } from "@nestjs/common";
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import pg from "pg";
import { schema } from "@adlc/database";

export const DATABASE_POOL = Symbol("DatabasePool");
export const DATABASE = Symbol("Database");

export type Database = NodePgDatabase<typeof schema>;

export async function inTransaction<T>(
  database: Database,
  work: (tx: Database) => Promise<T>,
): Promise<T> {
  return database.transaction((tx) => work(tx as Database));
}

@Global()
@Module({
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
  ],
  exports: [DATABASE_POOL, DATABASE],
})
export class DatabaseModule {}
