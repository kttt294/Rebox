import type { Provider } from "@nestjs/common";
import { CommerceModule, createDatabase, OutboxModule, type DatabaseContext } from "@reboxe/backend";

export const DATABASE = Symbol("DATABASE");
export const OUTBOX = Symbol("OUTBOX");
export const COMMERCE = Symbol("COMMERCE");

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
  },
  {
    provide: COMMERCE,
    inject: [DATABASE],
    useFactory: (database: DatabaseContext): CommerceModule => new CommerceModule(
      database.pool,
      process.env.SELLER_PII_ENCRYPTION_KEY ?? "local-dev-only-seller-pii-encryption-key-change-before-production",
      process.env.NODE_ENV !== "production" && (process.env.COMMERCE_MODE ?? "SANDBOX") === "SANDBOX"
    )
  }
];
