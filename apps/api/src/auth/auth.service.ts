import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as argon2 from 'argon2';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto, RegisterDto, RefreshTokenDto } from './dto/auth.dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async validateUser(email: string, password: string): Promise<any> {
    const employee = await this.prisma.employee.findFirst({
      where: {
        email,
        deleted_at: null,
        status: 'ACTIVE',
      },
      include: {
        organization: true,
      },
    });

    if (!employee) {
      return null;
    }

    // In a real implementation, you'd have a password field
    // For now, we'll use a placeholder validation
    const isPasswordValid = await argon2.verify(
      employee.email, // placeholder - should be hashed password
      password,
    ).catch(() => false);

    if (!isPasswordValid) {
      return null;
    }

    const { ...result } = employee;
    return result;
  }

  async login(loginDto: LoginDto) {
    const employee = await this.validateUser(loginDto.email, loginDto.password);
    
    if (!employee) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload = {
      sub: employee.id,
      email: employee.email,
      org_id: employee.org_id,
      role: employee.role,
      is_host: employee.is_host,
    };

    const accessToken = this.jwtService.sign(payload);
    const refreshToken = this.jwtService.sign(payload, {
      expiresIn: this.configService.get('JWT_REFRESH_EXPIRES_IN', '7d'),
    });

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      expires_in: 900, // 15 minutes
      user: {
        id: employee.id,
        org_id: employee.org_id,
        first_name: employee.first_name,
        last_name: employee.last_name,
        email: employee.email,
        role: employee.role,
        is_host: employee.is_host,
        avatar_url: employee.avatar_url,
      },
    };
  }

  async register(registerDto: RegisterDto) {
    // Check if organization exists
    const organization = await this.prisma.organization.findUnique({
      where: { slug: registerDto.org_slug },
    });

    if (!organization) {
      throw new BadRequestException('Organization not found');
    }

    // Check if email already exists
    const existingEmployee = await this.prisma.employee.findFirst({
      where: {
        email: registerDto.email,
        org_id: organization.id,
        deleted_at: null,
      },
    });

    if (existingEmployee) {
      throw new BadRequestException('Email already registered');
    }

    // Hash password
    const hashedPassword = await argon2.hash(registerDto.password);

    // Create employee
    const employee = await this.prisma.employee.create({
      data: {
        org_id: organization.id,
        first_name: registerDto.first_name,
        last_name: registerDto.last_name,
        email: registerDto.email,
        // password: hashedPassword, // Add this field to schema
        role: 'RECEPTIONIST',
        is_host: false,
        status: 'ACTIVE',
        created_by: 'self-registration',
      },
    });

    return this.login({
      email: registerDto.email,
      password: registerDto.password,
    });
  }

  async refreshToken(refreshTokenDto: RefreshTokenDto) {
    try {
      const payload = this.jwtService.verify(refreshTokenDto.refresh_token);
      
      // Verify user still exists and is active
      const employee = await this.prisma.employee.findUnique({
        where: {
          id: payload.sub,
          deleted_at: null,
          status: 'ACTIVE',
        },
      });

      if (!employee) {
        throw new UnauthorizedException('User not found or inactive');
      }

      const newPayload = {
        sub: employee.id,
        email: employee.email,
        org_id: employee.org_id,
        role: employee.role,
        is_host: employee.is_host,
      };

      const accessToken = this.jwtService.sign(newPayload);
      const newRefreshToken = this.jwtService.sign(newPayload, {
        expiresIn: this.configService.get('JWT_REFRESH_EXPIRES_IN', '7d'),
      });

      return {
        access_token: accessToken,
        refresh_token: newRefreshToken,
        expires_in: 900,
        user: {
          id: employee.id,
          org_id: employee.org_id,
          first_name: employee.first_name,
          last_name: employee.last_name,
          email: employee.email,
          role: employee.role,
          is_host: employee.is_host,
          avatar_url: employee.avatar_url,
        },
      };
    } catch (error) {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }
}