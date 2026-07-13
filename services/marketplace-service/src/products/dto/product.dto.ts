import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNumber,
  IsEnum,
  IsArray,
  IsOptional,
  Min,
  IsBoolean,
} from 'class-validator';
import { ProductType } from '../schemas/product.schema';

export class CreateProductDto {
  @ApiProperty({ example: 'Neon Dreams Vol. 1' })
  @IsString()
  title!: string;

  @ApiProperty({ example: 'A cyberpunk comic series set in Neo Tokyo' })
  @IsString()
  description!: string;

  @ApiProperty({ enum: ProductType, example: ProductType.COMIC })
  @IsEnum(ProductType)
  type!: ProductType;

  @ApiProperty({ example: 9.99 })
  @IsNumber()
  @Min(0)
  price!: number;

  @ApiProperty({ example: 'creator-uuid' })
  @IsString()
  creatorId!: string;

  @ApiProperty({ example: 'Jane Creator' })
  @IsString()
  creatorName!: string;

  @ApiProperty({ example: ['Comics', 'Sci-Fi'] })
  @IsArray()
  @IsString({ each: true })
  categories!: string[];

  @ApiProperty({ example: ['cyberpunk', 'neon'] })
  @IsArray()
  @IsString({ each: true })
  tags!: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  previewImageUrl?: string;
}

export class UpdateProductDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  price?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  categories?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isPublished?: boolean;
}

export class ProductQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ enum: ProductType })
  @IsOptional()
  @IsEnum(ProductType)
  type?: ProductType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  tag?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  creatorId?: string;
}
