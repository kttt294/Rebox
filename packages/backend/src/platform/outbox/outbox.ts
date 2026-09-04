import type { Pool } from "pg";

type OutboxRow = {
  id: string;
  topic: string;
};

export class OutboxModule {
  constructor(private readonly pool: Pool) {}

  async processBatch(limit = 10): Promise<number> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const claimed = await client.query<OutboxRow>(
        `SELECT id, topic
         FROM outbox_events
         WHERE status = 'PENDING' AND available_at <= now()
         ORDER BY created_at ASC
         FOR UPDATE SKIP LOCKED
         LIMIT $1`,
        [limit]
      );

      for (const event of claimed.rows) {
        if (event.topic !== "listing.published" && event.topic !== "listing.pending_review") {
          await client.query(
            `UPDATE outbox_events
             SET status = 'DEAD', attempts = attempts + 1,
                 claimed_at = now(), last_error = 'UNSUPPORTED_TOPIC'
             WHERE id = $1 AND status = 'PENDING'`,
            [event.id]
          );
          continue;
        }
        await client.query(
          `UPDATE outbox_events
           SET status = 'PROCESSED', attempts = attempts + 1,
               claimed_at = now(), processed_at = now(), last_error = NULL
           WHERE id = $1 AND status = 'PENDING'`,
          [event.id]
        );
      }

      await client.query("COMMIT");
      return claimed.rowCount ?? 0;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }
}
