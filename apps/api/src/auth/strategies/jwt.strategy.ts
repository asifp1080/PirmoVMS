import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get('JWT_SECRET'),
    });
  }

  async validate(payload: any) {
    const employee = await this.prisma.employee.findUnique({
      where: {
        id: payload.sub,
        deleted_at: null,
        status: 'ACTIVE',
      },
    });

    if (!employee) {
      throw new UnauthorizedException();
    }

    return {
      id: employee.id,
      email: employee.email,
      org_id: employee.org_id,
      role: employee.role,
      is_host: employee.is_host,
      first_name: employee.first_name,
      last_name: employee.last_name,
    };
  }
}