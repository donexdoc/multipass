import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common'
import * as bcrypt from 'bcrypt'
import { PrismaService } from '../../prisma/prisma.service.js'
import type { CreateUserDto, UpdateUserDto } from './dto/index.js'

const SELECT_USER = {
  id: true,
  login: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
} as const

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(includeInactive = false) {
    return this.prisma.user.findMany({
      where: includeInactive ? undefined : { isActive: true },
      select: SELECT_USER,
      orderBy: { createdAt: 'asc' },
    })
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id }, select: SELECT_USER })
    if (!user) throw new NotFoundException('User not found')
    return user
  }

  async create(dto: CreateUserDto) {
    const existing = await this.prisma.user.findUnique({ where: { login: dto.login } })
    if (existing) throw new BadRequestException('Login already taken')

    const passwordHash = await bcrypt.hash(dto.password, 10)
    return this.prisma.user.create({
      data: { login: dto.login, passwordHash },
      select: SELECT_USER,
    })
  }

  async update(id: string, dto: UpdateUserDto) {
    await this.findOne(id)

    if (dto.login) {
      const existing = await this.prisma.user.findUnique({ where: { login: dto.login } })
      if (existing && existing.id !== id) throw new BadRequestException('Login already taken')
    }

    const data: { login?: string; passwordHash?: string; isActive?: boolean } = {}
    if (dto.login !== undefined) data.login = dto.login
    if (dto.password !== undefined) data.passwordHash = await bcrypt.hash(dto.password, 10)
    if (dto.isActive !== undefined) data.isActive = dto.isActive

    return this.prisma.user.update({ where: { id }, data, select: SELECT_USER })
  }

  async remove(id: string) {
    await this.findOne(id)
    return this.prisma.user.update({
      where: { id },
      data: { isActive: false },
      select: SELECT_USER,
    })
  }
}
