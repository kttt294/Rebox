import type { Provider } from "@nestjs/common";
import { IdentityModule, InventoryModule, createDatabase, type DatabaseContext } from "@rebox/backend";

export const DATABASE = Symbol("DATABASE");
export const IDENTITY = Symbol("IDENTITY");
export const INVENTORY = Symbol("INVENTORY");

export const backendProviders: Provider[] = [
  {
    provide: DATABASE,
    useFactory: (): DatabaseContext =>
      createDatabase(
        process.env.DATABASE_URL ?? "postgresql://postgres:postgres@127.0.0.1:54322/postgres"
      )
  },
  {
    provide: IDENTITY,
    inject: [DATABASE],
    useFactory: (database: DatabaseContext): IdentityModule => new IdentityModule(database.pool)
  },
  {
    provide: INVENTORY,
    inject: [DATABASE, IDENTITY],
    useFactory: (database: DatabaseContext, identity: IdentityModule): InventoryModule =>
      new InventoryModule(database.pool, identity)
  }
];
