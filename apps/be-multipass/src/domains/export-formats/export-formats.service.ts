import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service.js'
import type { CreateExportFormatDto, UpdateExportFormatDto } from './dto/index.js'

@Injectable()
export class ExportFormatsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(includeDisabled = false) {
    return this.prisma.exportFormat.findMany({
      where: includeDisabled ? undefined : { isEnabled: true },
      orderBy: { createdAt: 'desc' },
    })
  }

  async findOne(id: string) {
    const format = await this.prisma.exportFormat.findUnique({ where: { id } })
    if (!format) throw new NotFoundException('Export format not found')
    return format
  }

  async create(dto: CreateExportFormatDto) {
    const existing = await this.prisma.exportFormat.findUnique({ where: { slug: dto.slug } })
    if (existing) throw new BadRequestException('Slug already taken')
    return this.prisma.exportFormat.create({ data: dto })
  }

  async update(id: string, dto: UpdateExportFormatDto) {
    await this.findOne(id)
    if (dto.slug) {
      const existing = await this.prisma.exportFormat.findUnique({ where: { slug: dto.slug } })
      if (existing && existing.id !== id) throw new BadRequestException('Slug already taken')
    }
    return this.prisma.exportFormat.update({ where: { id }, data: dto })
  }

  async remove(id: string) {
    await this.findOne(id)
    return this.prisma.exportFormat.update({
      where: { id },
      data: { isEnabled: false },
    })
  }
}
