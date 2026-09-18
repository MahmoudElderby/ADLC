import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import type { schema } from "@adlc/database";

export const DATABASE_POOL = Symbol("DatabasePool");
export const DATABASE = Symbol("Database");

export type Database = NodePgDatabase<typeof schema>;
