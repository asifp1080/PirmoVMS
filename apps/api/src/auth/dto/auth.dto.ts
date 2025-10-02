import { IsEmail, IsString, MinLength, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({
    description: 'User email address',
    example: 'john.admin@acme.com',
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    description: 'User password',
    example: 'SecurePassword123!',
    minLength: 8,
  })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiPropertyOptional({
    description: 'Organization slug (optional for single-org users)',
    example: 'acme-corp',
  })
  @IsOptional()
  @IsString()
  org_slug?: string;
}

export class RegisterDto {
  @ApiProperty({
    description: 'First name',
    example: 'John',
  })
  @IsString()
  first_name: string;

  @ApiProperty({
    description: 'Last name',
    example: 'Doe',
  })
  @IsString()
  last_name: string;

  @ApiProperty({
    description: 'Email address',
    example: 'john.doe@acme.com',
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    description: 'Password',
    example: 'SecurePassword123!',
    minLength: 8,
  })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiProperty({
    description: 'Organization slug',
    example: 'acme-corp',
  })
  @IsString()
  org_slug: string;
}

export class RefreshTokenDto {
  @ApiProperty({
    description: 'Refresh token',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  @IsString()
  refresh_token: string;
}

export class UserDto {
  @ApiProperty({ example: 'clqxyz1234567890' })
  id: string;

  @ApiProperty({ example: 'clqxyz0987654321' })
  org_id: string;

  @ApiProperty({ example: 'John' })
  first_name: string;

  @ApiProperty({ example: 'Doe' })
  last_name: string;

  @ApiProperty({ example: 'john.doe@acme.com' })
  email: string;

  @ApiProperty({ example: 'ADMIN', enum: ['ADMIN', 'RECEPTIONIST', 'SECURITY', 'MANAGER'] })
  role: string;

  @ApiProperty({ example: true })
  is_host: boolean;

  @ApiPropertyOptional({ example: 'https://api.dicebear.com/7.x/avataaars/svg?seed=john' })
  avatar_url?: string;
}

export class AuthResponseDto {
  @ApiProperty({
    description: 'JWT access token',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  access_token: string;

  @ApiProperty({
    description: 'JWT refresh token',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  refresh_token: string;

  @ApiProperty({
    description: 'Token expiration time in seconds',
    example: 900,
  })
  expires_in: number;

  @ApiProperty({
    description: 'User information',
    type: UserDto,
  })
  user: UserDto;
}