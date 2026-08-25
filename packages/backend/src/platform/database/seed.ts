import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { Pool } from "pg";

async function seed(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL ?? "postgresql://postgres:postgres@127.0.0.1:54322/postgres";
  const sql = await readFile(resolve(process.cwd(), "../../db/seeds/sprint1.sql"), "utf8");
  const pool = new Pool({ connectionString: databaseUrl });

  try {
    await pool.query(sql);
  } finally {
    await pool.end();
  }
}

void seed();
