import pg from "pg";

export type TestPostgres = {
  connectionString: string;
  query: pg.Pool["query"];
  close: () => Promise<void>;
};

export function createTestPostgres(
  connectionString = process.env.TEST_DATABASE_URL ??
    process.env.DATABASE_URL ??
    "postgres://adlc:adlc_dev_password@localhost:5432/adlc_test",
): TestPostgres {
  const pool = new pg.Pool({ connectionString });

  return {
    connectionString,
    query: pool.query.bind(pool),
    close: () => pool.end(),
  };
}
