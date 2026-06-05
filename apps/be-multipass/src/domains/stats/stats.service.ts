import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service.js'
import type { DashboardStats } from '@multipass/shared'

@Injectable()
export class StatsService {
  constructor(private readonly prisma: PrismaService) {}

  async getStats(): Promise<DashboardStats> {
    const [
      sourceAddresses,
      customAddresses,
      resolvedIps,
      sourceDomains,
      customDomains,
      activeSources,
      sourcesWithErrors,
      customEntriesCount,
      lastSourceFetch,
      lastDomainResolve,
      exportFormats,
    ] = await Promise.all([
      this.prisma.sourceAddress.count({
        where: { type: { in: ['IP', 'SUBNET', 'RANGE'] } },
      }),
      this.prisma.customEntry.count({
        where: { type: { in: ['IP', 'SUBNET', 'RANGE'] }, isEnabled: true },
      }),
      this.prisma.resolvedIp.count(),
      this.prisma.sourceAddress.count({ where: { type: 'DOMAIN' } }),
      this.prisma.customEntry.count({ where: { type: 'DOMAIN', isEnabled: true } }),
      this.prisma.source.count({ where: { isEnabled: true } }),
      this.prisma.source.count({ where: { isEnabled: true, lastStatus: 'FAILURE' } }),
      this.prisma.customEntry.count({ where: { isEnabled: true } }),
      this.prisma.updateLog.findFirst({
        where: { type: 'SOURCE_FETCH' },
        orderBy: { createdAt: 'desc' },
        include: { source: { select: { name: true } } },
      }),
      this.prisma.updateLog.findFirst({
        where: { type: 'DOMAIN_RESOLVE' },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.exportFormat.findMany({
        where: { isEnabled: true },
        select: { id: true, name: true, slug: true, contentType: true },
        orderBy: { createdAt: 'asc' },
      }),
    ])

    return {
      totalAddresses: sourceAddresses + customAddresses + resolvedIps,
      sourceAddresses,
      customAddresses,
      resolvedIps,
      domainsCount: sourceDomains + customDomains,
      activeSources,
      sourcesWithErrors,
      customEntriesCount,
      lastSourceFetch: lastSourceFetch
        ? {
            status: lastSourceFetch.status,
            completedAt: lastSourceFetch.completedAt?.toISOString() ?? null,
            sourceName: lastSourceFetch.source?.name ?? null,
            entriesAdded: lastSourceFetch.entriesAdded,
            entriesRemoved: lastSourceFetch.entriesRemoved,
          }
        : null,
      lastDomainResolve: lastDomainResolve
        ? {
            status: lastDomainResolve.status,
            completedAt: lastDomainResolve.completedAt?.toISOString() ?? null,
            entriesAdded: lastDomainResolve.entriesAdded,
          }
        : null,
      exportFormats,
    }
  }
}
