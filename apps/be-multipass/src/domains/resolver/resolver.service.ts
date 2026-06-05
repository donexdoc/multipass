import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common'
import { SchedulerRegistry } from '@nestjs/schedule'
import { CronJob } from 'cron'
import dns from 'node:dns/promises'
import { PrismaService } from '../../prisma/prisma.service.js'
import { SettingsService } from '../settings/settings.service.js'
import { ExportService } from '../export/export.service.js'

@Injectable()
export class ResolverService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ResolverService.name)
  private static readonly JOB_NAME = 'domain-resolve'

  constructor(
    private readonly prisma: PrismaService,
    private readonly settings: SettingsService,
    private readonly schedulerRegistry: SchedulerRegistry,
    private readonly exportService: ExportService,
  ) {}

  async onModuleInit() {
    const cronExpr = await this.settings.get('DOMAIN_RESOLVE_INTERVAL')
    this.scheduleJob(cronExpr)
  }

  onModuleDestroy() {
    try {
      this.schedulerRegistry.deleteCronJob(ResolverService.JOB_NAME)
    } catch {
      // not registered
    }
  }

  reschedule(cronExpr: string) {
    this.scheduleJob(cronExpr)
    this.logger.log(`Domain resolver rescheduled: ${cronExpr}`)
  }

  private scheduleJob(cronExpr: string) {
    try {
      this.schedulerRegistry.deleteCronJob(ResolverService.JOB_NAME)
    } catch {
      // not yet registered
    }
    const job = CronJob.from({
      cronTime: cronExpr,
      onTick: () => {
        this.resolve().catch(err => this.logger.error(String(err)))
      },
      start: true,
    })
    // cron@4 is a direct dep; @nestjs/schedule internally uses cron@3 — types differ at minor level
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this.schedulerRegistry.addCronJob(ResolverService.JOB_NAME, job as any)
    this.logger.log(`Domain resolver scheduled: ${cronExpr}`)
  }

  trigger() {
    this.resolve().catch(err => this.logger.error(`Manual resolve failed: ${String(err)}`))
  }

  async resolve() {
    const startedAt = new Date()
    this.logger.log('Domain resolution started')

    try {
      // Collect unique domains from both tables
      const [sourceDomains, entryDomains] = await Promise.all([
        this.prisma.sourceAddress.findMany({
          where: { type: 'DOMAIN' },
          select: { value: true },
          distinct: ['value'],
        }),
        this.prisma.customEntry.findMany({
          where: { type: 'DOMAIN', isEnabled: true },
          select: { value: true },
          distinct: ['value'],
        }),
      ])

      const domains = [...new Set([
        ...sourceDomains.map(r => r.value),
        ...entryDomains.map(r => r.value),
      ])]

      // Resolve all domains
      const resolved: Array<{ domain: string; ip: string }> = []
      await Promise.allSettled(
        domains.map(async domain => {
          try {
            const addresses = await dns.resolve4(domain)
            for (const ip of addresses) {
              resolved.push({ domain, ip })
            }
          } catch {
            // domain failed to resolve — skip silently
          }
        }),
      )

      // Count existing before delete
      const prevCount = await this.prisma.resolvedIp.count()

      // Hard delete + re-insert in a transaction
      await this.prisma.$transaction(async tx => {
        await tx.resolvedIp.deleteMany()
        if (resolved.length > 0) {
          await tx.resolvedIp.createMany({
            data: resolved,
            skipDuplicates: true,
          })
        }
      })

      const newCount = await this.prisma.resolvedIp.count()
      const ipsAdded = Math.max(0, newCount - prevCount)
      const ipsRemoved = Math.max(0, prevCount - newCount)

      await this.prisma.updateLog.create({
        data: {
          type: 'DOMAIN_RESOLVE',
          status: 'SUCCESS',
          entriesAdded: ipsAdded,
          entriesRemoved: ipsRemoved,
          startedAt,
          completedAt: new Date(),
        },
      })

      this.exportService.invalidateCache()
      this.logger.log(`Domain resolution done: ${domains.length} domains → ${newCount} IPs`)
      return { status: 'SUCCESS' as const, domainsResolved: domains.length, ipsAdded, ipsRemoved }
    } catch (err) {
      const errorMessage = String(err)
      await this.prisma.updateLog.create({
        data: {
          type: 'DOMAIN_RESOLVE',
          status: 'FAILURE',
          errorMessage,
          startedAt,
          completedAt: new Date(),
        },
      })
      this.logger.error(`Domain resolution failed: ${errorMessage}`)
      return { status: 'FAILURE' as const, domainsResolved: 0, ipsAdded: 0, ipsRemoved: 0, errorMessage }
    }
  }
}
