import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class UpdateProfileDto {
  @ApiPropertyOptional({ example: 'Alex Rivera' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  name?: string;

  @ApiPropertyOptional({ example: 'Digital artist and comic creator.' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  bio?: string;

  @ApiPropertyOptional({ example: 'https://vividcraft.example' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  website?: string;

  @ApiPropertyOptional({ example: 'vividcraft' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  twitter?: string;

  @ApiPropertyOptional({ example: 'vividcraft' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  instagram?: string;

  @ApiPropertyOptional({ example: 'vividcraft' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  discord?: string;
}
