import { Injectable, NotFoundException } from '@nestjs/common'
import { EventEmitter2 } from '@nestjs/event-emitter'
import { PrismaService } from '../../prisma/prisma.service.js'

@Injectable()
export class ExportService {
  private readonly cache = new Map<string, string>()

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  invalidateCache() {
    this.cache.clear()
    this.eventEmitter.emit('addresses.changed')
  }

  async generate(slug: string): Promise<{ content: string; contentType: string }> {
    const cached = this.cache.get(slug)
    if (cached !== undefined) {
      const format = await this.prisma.exportFormat.findUnique({ where: { slug, isEnabled: true } })
      if (!format) throw new NotFoundException('Export format not found')
      return { content: cached, contentType: format.contentType }
    }

    const format = await this.prisma.exportFormat.findUnique({ where: { slug, isEnabled: true } })
    if (!format) throw new NotFoundException('Export format not found')

    // Collect addresses from all three sources.
    // DISTINCT per table reduces PG→Node traffic; final Set removes cross-table duplicates.
    const [sourceAddresses, customEntries, resolvedIps] = await Promise.all([
      this.prisma.sourceAddress.findMany({
        where: { type: { in: ['IP', 'SUBNET', 'RANGE'] } },
        distinct: ['value'],
        select: { value: true },
      }),
      this.prisma.customEntry.findMany({
        where: { type: { in: ['IP', 'SUBNET', 'RANGE'] }, isEnabled: true },
        distinct: ['value'],
        select: { value: true },
      }),
      this.prisma.resolvedIp.findMany({
        select: { ip: true },
        // resolved_ips already has @@unique([domain, ip]), so IPs may still repeat
        // across different domains — deduplicated below
      }),
    ])

    const addresses = [
      ...new Set([
        ...sourceAddresses.map(r => r.value),
        ...customEntries.map(r => r.value),
        ...resolvedIps.map(r => r.ip),
      ]),
    ]

    const lines = addresses.map(addr => format.lineTemplate.replace('{address}', addr))
    const content = [format.header, lines.join('\n'), format.footer].filter(Boolean).join('\n')

    this.cache.set(slug, content)
    return { content, contentType: format.contentType }
  }
}
