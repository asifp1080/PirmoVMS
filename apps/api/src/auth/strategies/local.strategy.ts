import { Injectable } from '@nestjs/common'
import { PassportStrategy } from '@nestjs/passport'
import { Strategy } from 'passport-local'
import { AuthService } from '../auth.service'

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
  constructor(private authService: AuthService) {
    super({
      usernameField: 'email',
      passReqToCallback: true,
    })
  }

  async validate(req: any, email: string, password: string): Promise<any> {
    const { org_slug } = req.body
    const user = await this.authService.validateUser(email, password, org_slug)
    if (!user) {
      return null
    }
    return user
  }
}