import {
  Body,
  Controller,
  DefaultValuePipe,
  Delete,
  Get,
  ParseIntPipe,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { IndexDocumentDto } from './dto/index-document.dto';
import { SearchService } from './search.service';

// Past this, multer drops the file and Nest answers 413
const MAX_FILE_BYTES = 50 * 1024 * 1024;
// Text fields get the same 100 KB as a JSON body, and at most 20 of them
const FIELD_LIMITS = { fieldSize: 100 * 1024, fields: 20 };

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

  // A file comes as multipart, in a `file` part with the other fields beside it; a document without a file can also come as JSON
  @Post('index')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: MAX_FILE_BYTES, ...FIELD_LIMITS },
    }),
  )
  indexDoc(
    @Body() doc: IndexDocumentDto,
    @UploadedFile() file?: { buffer: Buffer },
  ): Promise<{ indexed: string }> {
    return this.searchService.index(doc, file?.buffer);
  }

  @Delete('index')
  deleteIndex(): Promise<any> {
    return this.searchService.deleteIndex();
  }
}
