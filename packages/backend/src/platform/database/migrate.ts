import { migrate } from "drizzle-orm/node-postgres/migrator";
import { resolve } from "node:path";
import { createDatabase } from "./client";

async function main(): Promise<void> {
  const database = createDatabase(process.env.DATABASE_URL ?? "postgresql://postgres:postgres@127.0.0.1:54322/postgres");
  try {
    await migrate(database.db, { migrationsFolder: resolve(process.cwd(), "../../db/migrations") });
  } finally {
    await database.pool.end();
  }
}

void main();
