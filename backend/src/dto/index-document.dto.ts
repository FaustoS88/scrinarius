import { Transform } from 'class-transformer';
import { IsOptional, IsString, IsArray, ArrayNotEmpty } from 'class-validator';

export class IndexDocumentDto {
  @IsOptional()
  @IsString()
  id?: string;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  body?: string;

  // One `tags` part in multipart arrives as a string, several as a list
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? [value] : value,
  )
  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsString()
  published?: string;
}
