import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service.js'
import { SourceFetcherService } from './source-fetcher.service.js'
import type { CreateSourceDto, UpdateSourceDto } from './dto/index.js'

@Injectable()
export class SourcesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly fetcher: SourceFetcherService,
  ) {}

  findAll(includeDisabled = false) {
    return this.prisma.source.findMany({
      where: includeDisabled ? undefined : { isEnabled: true },
      orderBy: { createdAt: 'desc' },
    })
  }

  async findOne(id: string) {
    const source = await this.prisma.source.findUnique({ where: { id } })
    if (!source) throw new NotFoundException('Source not found')
    return source
  }

  async create(dto: CreateSourceDto) {
    const source = await this.prisma.source.create({ data: dto })
    if (source.isEnabled) {
      this.fetcher.scheduleSource(source)
    }
    return source
  }

  async update(id: string, dto: UpdateSourceDto) {
    const existing = await this.findOne(id)
    const updated = await this.prisma.source.update({ where: { id }, data: dto })

    const intervalChanged = dto.updateInterval !== undefined && dto.updateInterval !== existing.updateInterval
    const enabledChanged = dto.isEnabled !== undefined && dto.isEnabled !== existing.isEnabled

    if (updated.isEnabled && (intervalChanged || enabledChanged)) {
      this.fetcher.scheduleSource(updated)
    } else if (!updated.isEnabled && enabledChanged) {
      this.fetcher.removeSchedule(id)
    }

    return updated
  }

  async remove(id: string) {
    await this.findOne(id)
    const updated = await this.prisma.source.update({
      where: { id },
      data: { isEnabled: false },
    })
    this.fetcher.removeSchedule(id)
    return updated
  }

  async refresh(id: string) {
    await this.findOne(id)
    // fire-and-forget: client gets 202-style immediate response
    this.fetcher.fetchSource(id).catch(() => {
      // error is logged inside fetchSource
    })
    return { message: 'Fetch started' }
  }
}
