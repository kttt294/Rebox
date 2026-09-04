import type { Provider } from "@nestjs/common";
import {
  IdentityModule,
  InventoryModule,
  createDatabase,
  type CatalogMediaStorage,
  type DatabaseContext
} from "@rebox/backend";
import { SupabaseCatalogMediaStorage } from "./platform/storage/supabase-catalog-media-storage";

export const DATABASE = Symbol("DATABASE");
export const IDENTITY = Symbol("IDENTITY");
export const INVENTORY = Symbol("INVENTORY");
export const CATALOG_MEDIA_STORAGE = Symbol("CATALOG_MEDIA_STORAGE");

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
    provide: CATALOG_MEDIA_STORAGE,
    useFactory: (): CatalogMediaStorage => {
      const url = process.env.SUPABASE_URL ?? "http://127.0.0.1:54321";
      const secretKey = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
      if (!secretKey) throw new Error("SUPABASE_SECRET_KEY is required for catalog media storage");
      return new SupabaseCatalogMediaStorage(url, secretKey);
    }
  },
  {
    provide: INVENTORY,
    inject: [DATABASE, IDENTITY, CATALOG_MEDIA_STORAGE],
    useFactory: (
      database: DatabaseContext,
      identity: IdentityModule,
      mediaStorage: CatalogMediaStorage
    ): InventoryModule => new InventoryModule(database.pool, identity, mediaStorage)
  }
];
