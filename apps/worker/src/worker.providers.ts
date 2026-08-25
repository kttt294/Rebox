import type { Provider } from "@nestjs/common";
import { createDatabase, OutboxModule, type DatabaseContext } from "@rebox/backend";

export const DATABASE = Symbol("DATABASE");
export const OUTBOX = Symbol("OUTBOX");

export const workerProviders: Provider[] = [
  {
    provide: DATABASE,
    useFactory: (): DatabaseContext =>
      createDatabase(
        process.env.DATABASE_URL ?? "postgresql://postgres:postgres@127.0.0.1:54322/postgres"
      )
  },
  {
    provide: OUTBOX,
    inject: [DATABASE],
    useFactory: (database: DatabaseContext): OutboxModule => new OutboxModule(database.pool)
  }
];
