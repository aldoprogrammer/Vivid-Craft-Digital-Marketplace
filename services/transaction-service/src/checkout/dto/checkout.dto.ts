import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsArray,
  ValidateNested,
  IsNumber,
  Min,
  ArrayMinSize,
  IsEnum,
  IsOptional,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PaymentProvider } from './payment-provider.enum';
import { CheckoutCurrency } from './checkout-currency.enum';

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
  @ApiProperty({ type: [CheckoutItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CheckoutItemDto)
  items!: CheckoutItemDto[];

  @ApiProperty({ enum: CheckoutCurrency, example: CheckoutCurrency.USD })
  @IsEnum(CheckoutCurrency)
  checkoutCurrency!: CheckoutCurrency;

  @ApiPropertyOptional({ enum: PaymentProvider, example: PaymentProvider.STRIPE })
  @IsOptional()
  @IsEnum(PaymentProvider)
  paymentProvider?: PaymentProvider;
}
