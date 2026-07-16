import { ApiProperty } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { IsEmail, IsIn, IsString, MinLength } from 'class-validator';

export class RegisterDto {
  @ApiProperty({ example: 'creator@vividcraft.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'SecurePass123!' })
  @IsString()
  @MinLength(8)
  password!: string;

  @ApiProperty({ example: 'Jane Creator' })
  @IsString()
  name!: string;

  @ApiProperty({ enum: [Role.CREATOR, Role.FAN], example: Role.CREATOR })
  @IsIn([Role.CREATOR, Role.FAN])
  role!: Role;
}

export class LoginDto {
  @ApiProperty({ example: 'creator@vividcraft.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'SecurePass123!' })
  @IsString()
  password!: string;
}

export class AuthResponseDto {
  @ApiProperty()
  accessToken!: string;

  @ApiProperty()
  refreshToken!: string;

  @ApiProperty()
  user!: {
    id: string;
    email: string;
    name: string;
    role: Role;
  };
}
