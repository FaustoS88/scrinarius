import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { openSearchClient, OpenSearchErrorFilter } from './opensearch.client';
import { SearchController } from './search.controller';
import { SearchService } from './search.service';

@Module({
  controllers: [SearchController],
  providers: [
    openSearchClient,
    SearchService,
    { provide: APP_FILTER, useClass: OpenSearchErrorFilter },
  ],
})
export class AppModule {}
