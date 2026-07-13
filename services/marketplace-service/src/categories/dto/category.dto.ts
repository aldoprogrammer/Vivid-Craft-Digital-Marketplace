import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional } from 'class-validator';

export class CreateCategoryDto {
  @ApiProperty({ example: 'Comics' })
  @IsString()
  name!: string;

  @ApiPropertyOptional({ example: 'Digital comic books and graphic novels' })
  @IsOptional()
  @IsString()
  description?: string;
}
