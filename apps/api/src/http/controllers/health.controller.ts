import { Controller, Get, Inject } from "@nestjs/common";
import type { DatabaseContext } from "@rebox/backend";
import { DATABASE } from "../../backend.providers";
import { Public } from "../decorators/public";

@Controller("health")
export class HealthController {
  constructor(@Inject(DATABASE) private readonly database: DatabaseContext) {}

  @Public()
  @Get("live")
  live(): { status: "ok" } {
    return { status: "ok" };
  }

  @Public()
  @Get("ready")
  async ready(): Promise<{ status: "ok" }> {
    await this.database.pool.query("SELECT 1");
    return { status: "ok" };
  }
}
