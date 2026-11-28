import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { describeOpenSearchError } from './opensearch.client';
import { Logger } from '@nestjs/common';
import { Client } from '@opensearch-project/opensearch';

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

  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();
