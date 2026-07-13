import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsEmail,
  IsArray,
  ValidateNested,
  IsNumber,
  Min,
  ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CheckoutItemDto {
  @ApiProperty({ example: 'product-uuid' })
  @IsString()
  productId!: string;

  @ApiProperty({ example: 'Neon Dreams Vol. 1' })
  @IsString()
  productName!: string;

  @ApiProperty({ example: 'COMIC' })
  @IsString()
  productType!: string;

  @ApiProperty({ example: 9.99 })
  @IsNumber()
  @Min(0)
  price!: number;

  @ApiProperty({ example: 1 })
  @IsNumber()
  @Min(1)
  quantity!: number;
}

export class CheckoutDto {
  @ApiProperty({ example: 'user-uuid' })
  @IsString()
  userId!: string;

  @ApiProperty({ example: 'fan@vividcraft.com' })
  @IsEmail()
  userEmail!: string;

  @ApiProperty({ type: [CheckoutItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CheckoutItemDto)
  items!: CheckoutItemDto[];
}
