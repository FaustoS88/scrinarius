import {
  Body,
  Controller,
  DefaultValuePipe,
  Delete,
  Get,
  ParseIntPipe,
  Post,
  Query,
} from '@nestjs/common';
import { IndexDocumentDto } from './dto/index-document.dto';
import { SearchService } from './search.service';

@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get()
  search(
    @Query('q') q = '',
    @Query('from', new DefaultValuePipe(0), ParseIntPipe) from: number,
    @Query('size', new DefaultValuePipe(50), ParseIntPipe) size: number,
  ): Promise<any[]> {
    return this.searchService.search(q, from, size);
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
