import { Inject, Module, type OnApplicationShutdown } from "@nestjs/common";
import type { DatabaseContext } from "@rebox/backend";
import { OutboxConsumer } from "./outbox.consumer";
import { DATABASE, workerProviders } from "./worker.providers";

@Module({ providers: [...workerProviders, OutboxConsumer] })
export class WorkerModule implements OnApplicationShutdown {
  constructor(@Inject(DATABASE) private readonly database: DatabaseContext) {}

  async onApplicationShutdown(): Promise<void> {
    await this.database.pool.end();
  }
}
