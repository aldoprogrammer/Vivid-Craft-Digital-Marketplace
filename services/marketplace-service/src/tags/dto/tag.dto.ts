import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class CreateTagDto {
  @ApiProperty({ example: 'cyberpunk' })
  @IsString()
  name!: string;
}
