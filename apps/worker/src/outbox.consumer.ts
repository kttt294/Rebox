import { Inject, Injectable, Logger, type OnModuleDestroy, type OnModuleInit } from "@nestjs/common";
import type { OutboxModule } from "@rebox/backend";
import { OUTBOX } from "./worker.providers";
import { COMMERCE } from "./worker.providers";
import type { CommerceModule } from "@rebox/backend";

@Injectable()
export class OutboxConsumer implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(OutboxConsumer.name);
  private stopped = false;
  private timer?: NodeJS.Timeout;

  constructor(
    @Inject(OUTBOX) private readonly outbox: OutboxModule,
    @Inject(COMMERCE) private readonly commerce: CommerceModule
  ) {}

  onModuleInit(): void {
    void this.poll();
  }

  onModuleDestroy(): void {
    this.stopped = true;
    if (this.timer) {
      clearTimeout(this.timer);
    }
  }

  private async poll(): Promise<void> {
    if (this.stopped) {
      return;
    }
    try {
      const processed = await this.outbox.processBatch();
      const expired = await this.commerce.expireReservations();
      if (processed > 0 || expired > 0) {
        this.logger.log({ event: "outbox.batch.processed", processed, expired });
      }
    } catch (error) {
      this.logger.error({
        event: "outbox.batch.failed",
        message: error instanceof Error ? error.message : "Unknown error"
      });
    } finally {
      if (!this.stopped) {
        this.timer = setTimeout(() => void this.poll(), 1_000);
      }
    }
  }
}
