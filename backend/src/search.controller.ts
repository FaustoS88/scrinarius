import { Body, Controller, Delete, Get, Post, Query } from '@nestjs/common';
import { IndexDocumentDto } from './dto/index-document.dto';
import { SearchService } from './search.service';

@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get()
  search(
    @Query('q') q = '',
    @Query('from') from = '0',
    @Query('size') size = '50',
  ): Promise<any[]> {
    return this.searchService.search(q, parseInt(from, 10), parseInt(size, 10));
  }

  @Post('index')
  indexDoc(@Body() doc: IndexDocumentDto): Promise<{ indexed: string }> {
    return this.searchService.index(doc);
  }

  @Delete('index')
  deleteIndex(): Promise<any> {
    return this.searchService.deleteIndex();
  }
}
