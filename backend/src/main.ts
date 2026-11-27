import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { describeOpenSearchError } from './opensearch.client';
import { Logger, ValidationPipe } from '@nestjs/common';
import { Client } from '@opensearch-project/opensearch';
import { json, urlencoded } from 'express';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Stop here if OpenSearch is down or refuses the key, rather than on the first request
  try {
    const { body } = await app.get(Client).info();
    Logger.log(`OpenSearch OK ${body.version.number}`, 'OpenSearch');
  } catch (error) {
    Logger.error(describeOpenSearchError(error), 'OpenSearch');
    process.exit(1);
  }

  // The React page runs on another origin
  app.enableCors();

  // PDFs arrive as base64 inside JSON, so raise the default limit of about 100 KB
  app.use(json({ limit: '50mb' }));
  app.use(urlencoded({ limit: '50mb', extended: true }));

  // Strip unknown properties and reject requests that send them
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }),
  );

  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();
