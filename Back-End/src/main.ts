import "reflect-metadata";
import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { join } from "path";
import { NestExpressApplication } from "@nestjs/platform-express";

function parseCorsOrigins(value?: string): string[] {
  if (!value) return ["http://localhost:5173", "http://localhost:3000"];
  return value
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.enableCors({
    origin: parseCorsOrigins(process.env.CORS_ORIGINS),
    credentials: true,
  });

  app.setGlobalPrefix("api");

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    })
  );

  app.useStaticAssets(join(process.cwd(), "uploads"), {
    prefix: "/uploads",
  });

// Explicitly bind to 0.0.0.0 for Railway/Production environments
await app.listen(Number(process.env.PORT || 3000), '0.0.0.0');}

bootstrap();