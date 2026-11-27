import { Module, ValidationPipe } from '@nestjs/common';
import { APP_FILTER, APP_PIPE } from '@nestjs/core';
import { openSearchClient, OpenSearchErrorFilter } from './opensearch.client';
import { SearchController } from './search.controller';
import { SearchService } from './search.service';

@Module({
  controllers: [SearchController],
  providers: [
    openSearchClient,
    SearchService,
    { provide: APP_FILTER, useClass: OpenSearchErrorFilter },
    // Reject requests with properties the DTO does not declare; set here, not in main.ts, so tests built from this module get it too
    {
      provide: APP_PIPE,
      useValue: new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    },
  ],
})
export class AppModule {}
