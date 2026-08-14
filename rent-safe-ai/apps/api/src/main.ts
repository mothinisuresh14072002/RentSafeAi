import { NestFactory, HttpAdapterHost } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import * as compression from 'compression';
const comp =
  typeof compression === 'function'
    ? compression
    : (compression as any).default || compression;
import { Logger } from 'nestjs-pino';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { envSchema } from './config/env.validation';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  // Validate environment variables early
  const env = envSchema.parse(process.env);

  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  // 1. Logger setup
  const logger = app.get(Logger);
  app.useLogger(logger);

  // 2. Global prefix
  app.setGlobalPrefix('api/v1');

  // 3. Security headers (Helmet)
  app.use(helmet());

  // 4. CORS allowlist setup
  app.enableCors({
    origin: process.env.CORS_ORIGIN
      ? process.env.CORS_ORIGIN.split(',')
      : env.NODE_ENV === 'production'
        ? []
        : '*',
    credentials: true,
  });

  // 5. Compression
  app.use(comp());

  // 6. Global Validation Pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // 7. Global Exception Filter
  const httpAdapter = app.get(HttpAdapterHost);
  app.useGlobalFilters(new AllExceptionsFilter(httpAdapter));

  // 8. Swagger conditionally enabled
  if (env.ENABLE_SWAGGER) {
    const config = new DocumentBuilder()
      .setTitle('RentSafe API')
      .setDescription('The RentSafe API description')
      .setVersion('1.0')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);
  }

  await app.listen(env.PORT);
  logger.log(`Application listening on port ${env.PORT}`);
}

// Catch floating promises gracefully
bootstrap().catch((err) => {
  console.error('Error starting server', err);
  process.exit(1);
});
