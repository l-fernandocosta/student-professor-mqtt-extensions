import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./modules/app.module";

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix("api");
  const allowedOrigins = [
    "http://localhost:3101",
    "http://localhost:3102",
    "http://127.0.0.1:3101",
    "http://127.0.0.1:3102"
  ];

  app.enableCors({
    origin: (origin, callback) => {
      // Allow extension/runtime requests without origin and local frontend dev origins.
      if (!origin || origin.startsWith("chrome-extension://") || allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error(`CORS blocked for origin: ${origin}`), false);
    },
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["content-type", "authorization"]
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true
    })
  );
  await app.listen(process.env.BACKEND_PORT ? Number(process.env.BACKEND_PORT) : 3000);
}

bootstrap();
