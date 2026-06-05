import { Injectable } from '@nestjs/common'
import type { LogType } from '@multipass/prisma'
import { PrismaService } from '../../prisma/prisma.service.js'

export interface FindLogsOptions {
  type?: LogType
  limit?: number
  offset?: number
}

@Injectable()
export class LogsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll({ type, limit = 50, offset = 0 }: FindLogsOptions) {
    const logs = await this.prisma.updateLog.findMany({
      where: type ? { type } : undefined,
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
      include: {
        source: { select: { name: true } },
      },
    })

    return logs.map(({ source, ...log }) => ({
      ...log,
      sourceName: source?.name ?? null,
    }))
  }
}
