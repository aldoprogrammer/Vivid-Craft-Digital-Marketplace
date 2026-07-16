import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsString, Max, Min, MinLength } from 'class-validator';

export class CreateReviewDto {
  @ApiProperty({ example: 'product-mongo-id' })
  @IsString()
  productId!: string;

  @ApiProperty({ example: 5, minimum: 1, maximum: 5 })
  @IsInt()
  @Min(1)
  @Max(5)
  rating!: number;

  @ApiProperty({ example: 'Amazing artwork, instant download worked perfectly.' })
  @IsString()
  @MinLength(3)
  comment!: string;
}

export class ReplyReviewDto {
  @ApiProperty({ example: 'Thanks for the kind words!' })
  @IsString()
  @MinLength(1)
  comment!: string;
}
