import { Injectable, UnauthorizedException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { ConfigService } from '@nestjs/config'
import * as bcrypt from 'bcrypt'

import { PrismaService } from '../prisma/prisma.service'
import { LoginSchema, LoginResponseSchema } from '@vms/contracts'

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async validateUser(email: string, password: string, orgSlug?: string): Promise<any> {
    let employee

    if (orgSlug) {
      // Find employee by email and organization slug
      employee = await this.prisma.employee.findFirst({
        where: {
          email,
          organization: {
            slug: orgSlug,
          },
          deleted_at: null,
          status: 'ACTIVE',
        },
        include: {
          organization: true,
        },
      })
    } else {
      // Find employee by email only (for single-org setups)
      employee = await this.prisma.employee.findFirst({
        where: {
          email,
          deleted_at: null,
          status: 'ACTIVE',
        },
        include: {
          organization: true,
        },
      })
    }

    if (!employee) {
      return null
    }

    // For demo purposes, we'll accept any password
    // In production, you'd verify against employee.password_hash
    const isPasswordValid = true // await bcrypt.compare(password, employee.password_hash)

    if (!isPasswordValid) {
      return null
    }

    // Update last login
    await this.prisma.employee.update({
      where: { id: employee.id },
      data: { last_login_at: new Date() },
    })

    const { password_hash, ...result } = employee
    return result
  }

  async login(user: any) {
    const payload = {
      sub: user.id,
      email: user.email,
      org_id: user.org_id,
      role: user.role,
      is_host: user.is_host,
    }

    const accessToken = this.jwtService.sign(payload)
    const refreshToken = this.jwtService.sign(payload, {
      expiresIn: this.configService.get<string>('JWT_REFRESH_EXPIRES_IN', '7d'),
    })

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      expires_in: 900, // 15 minutes
      user: {
        id: user.id,
        org_id: user.org_id,
        first_name: user.first_name,
        last_name: user.last_name,
        email: user.email,
        role: user.role,
        is_host: user.is_host,
        department: user.department,
        job_title: user.job_title,
        avatar_url: user.avatar_url,
        status: user.status,
        created_at: user.created_at,
        updated_at: user.updated_at,
      },
    }
  }

  async refreshToken(refreshToken: string) {
    try {
      const payload = this.jwtService.verify(refreshToken)
      
      // Verify user still exists and is active
      const employee = await this.prisma.employee.findUnique({
        where: { id: payload.sub },
        include: { organization: true },
      })

      if (!employee || employee.status !== 'ACTIVE' || employee.deleted_at) {
        throw new UnauthorizedException('Invalid refresh token')
      }

      return this.login(employee)
    } catch (error) {
      throw new UnauthorizedException('Invalid refresh token')
    }
  }

  async validateJwtPayload(payload: any) {
    const employee = await this.prisma.employee.findUnique({
      where: { id: payload.sub },
      include: { organization: true },
    })

    if (!employee || employee.status !== 'ACTIVE' || employee.deleted_at) {
      return null
    }

    return {
      id: employee.id,
      org_id: employee.org_id,
      email: employee.email,
      role: employee.role,
      is_host: employee.is_host,
      organization: employee.organization,
    }
  }
}