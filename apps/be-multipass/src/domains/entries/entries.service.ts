import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service.js'
import { ExportService } from '../export/export.service.js'
import type { CreateEntryDto, UpdateEntryDto } from './dto/index.js'

@Injectable()
export class EntriesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly exportService: ExportService,
  ) {}

  findAll(includeDisabled = false) {
    return this.prisma.customEntry.findMany({
      where: includeDisabled ? undefined : { isEnabled: true },
      orderBy: { createdAt: 'desc' },
    })
  }

  async findOne(id: string) {
    const entry = await this.prisma.customEntry.findUnique({ where: { id } })
    if (!entry) throw new NotFoundException('Entry not found')
    return entry
  }

  async create(dto: CreateEntryDto) {
    const entry = await this.prisma.customEntry.create({ data: dto })
    this.exportService.invalidateCache()
    return entry
  }

  async update(id: string, dto: UpdateEntryDto) {
    await this.findOne(id)
    const entry = await this.prisma.customEntry.update({ where: { id }, data: dto })
    this.exportService.invalidateCache()
    return entry
  }

  async remove(id: string) {
    await this.findOne(id)
    const entry = await this.prisma.customEntry.update({
      where: { id },
      data: { isEnabled: false },
    })
    this.exportService.invalidateCache()
    return entry
  }
}
