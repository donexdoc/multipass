import { Injectable, UnauthorizedException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import * as bcrypt from 'bcrypt'
import { PrismaService } from '../../prisma/prisma.service.js'
import type { LoginDto } from './dto/index.js'

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({ where: { login: dto.login } })
    if (!user || !user.isActive) throw new UnauthorizedException('Invalid credentials')

    const valid = await bcrypt.compare(dto.password, user.passwordHash)
    if (!valid) throw new UnauthorizedException('Invalid credentials')

    return this.issueTokens(user.id, user.login)
  }

  async refresh(refreshToken: string) {
    try {
      const payload = this.jwt.verify<{ sub: string; login: string }>(refreshToken, {
        secret: process.env['JWT_REFRESH_SECRET'] ?? 'fallback-refresh-secret',
      })
      const user = await this.prisma.user.findUnique({ where: { id: payload.sub } })
      if (!user || !user.isActive) throw new UnauthorizedException()
      return this.issueTokens(user.id, user.login)
    } catch {
      throw new UnauthorizedException('Invalid refresh token')
    }
  }

  private issueTokens(userId: string, login: string) {
    const payload = { sub: userId, login }

    const accessToken = this.jwt.sign(payload, {
      secret: process.env['JWT_SECRET'] ?? 'fallback-secret',
      expiresIn: 900, // 15m in seconds
    })

    const refreshToken = this.jwt.sign(payload, {
      secret: process.env['JWT_REFRESH_SECRET'] ?? 'fallback-refresh-secret',
      expiresIn: 2592000, // 30d in seconds
    })

    return { accessToken, refreshToken }
  }
}
