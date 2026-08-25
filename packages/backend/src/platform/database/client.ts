import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

export type Database = NodePgDatabase<typeof schema>;

export type DatabaseContext = {
  pool: Pool;
  db: Database;
};

export function createDatabase(databaseUrl: string): DatabaseContext {
  const pool = new Pool({ connectionString: databaseUrl });
  return { pool, db: drizzle({ client: pool, schema }) };
}
