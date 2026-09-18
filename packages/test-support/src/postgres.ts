import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import pg from "pg";
import { schema } from "@adlc/database";

export type SchemaDatabase = NodePgDatabase<typeof schema>;

export type TestPostgres = {
  connectionString: string;
  pool: pg.Pool;
  db: SchemaDatabase;
  query: pg.Pool["query"];
  close: () => Promise<void>;
};

const drizzleDir = join(dirname(fileURLToPath(import.meta.url)), "../../database/drizzle");

function isAlreadyAppliedError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return (
    message.includes("already exists") ||
    message.includes("duplicate key") ||
    message.includes("pg_type_typname_nsp_index")
  );
}

async function applyMigrations(pool: pg.Pool): Promise<void> {
  await pool.query("SELECT pg_advisory_lock(870018)");
  try {
    await pool.query("CREATE TABLE IF NOT EXISTS schema_migrations (id text PRIMARY KEY)");
    const files = readdirSync(drizzleDir)
      .filter((file) => file.endsWith(".sql"))
      .sort();

    for (const file of files) {
      const applied = await pool.query("SELECT 1 FROM schema_migrations WHERE id = $1", [file]);
      if ((applied.rowCount ?? 0) > 0) {
        continue;
      }

      const sql = readFileSync(join(drizzleDir, file), "utf8");
      try {
        await pool.query(sql);
      } catch (error) {
        if (!isAlreadyAppliedError(error)) {
          throw error;
        }
      }
      await pool.query("INSERT INTO schema_migrations(id) VALUES ($1) ON CONFLICT DO NOTHING", [
        file,
      ]);
    }
  } finally {
    await pool.query("SELECT pg_advisory_unlock(870018)");
  }
}

let shared: Promise<TestPostgres> | undefined;

export function createTestPostgres(
  connectionString = process.env.TEST_DATABASE_URL ??
    process.env.DATABASE_URL ??
    "postgres://adlc:adlc_dev_password@localhost:5432/adlc",
): TestPostgres {
  const pool = new pg.Pool({ connectionString, max: 20 });
  const db = drizzle(pool, { schema });

  return {
    connectionString,
    pool,
    db,
    query: pool.query.bind(pool),
    close: () => pool.end(),
  };
}

export async function getSharedTestPostgres(): Promise<TestPostgres> {
  shared ??= (async () => {
    const postgres = createTestPostgres();
    await applyMigrations(postgres.pool);
    return postgres;
  })();
  return shared;
}
