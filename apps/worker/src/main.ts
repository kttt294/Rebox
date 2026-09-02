import { ConsoleLogger } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { loadEnvFile } from "node:process";
import { resolve } from "node:path";
import { WorkerModule } from "./worker.module";

try {
  loadEnvFile(resolve(__dirname, "../../../.env"));
} catch (error) {
  if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
}

async function bootstrap(): Promise<void> {
  const app = await NestFactory.createApplicationContext(WorkerModule, {
    logger: new ConsoleLogger({ json: true })
  });
  app.enableShutdownHooks();
}

void bootstrap();
