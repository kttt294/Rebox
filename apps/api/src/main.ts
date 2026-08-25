import { ConsoleLogger } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { AppModule } from "./app.module";

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, {
    logger: new ConsoleLogger({ json: true })
  });
  app.enableCors({ origin: process.env.WEB_ORIGIN ?? "http://localhost:3000" });
  app.enableShutdownHooks();

  const document = SwaggerModule.createDocument(
    app,
    new DocumentBuilder().setTitle("REBOX API").setVersion("1.0").addBearerAuth().build()
  );
  SwaggerModule.setup("docs", app, document);

  await app.listen(Number(process.env.API_PORT ?? 3001));
}

void bootstrap();
