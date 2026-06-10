import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common'
import { SchedulerRegistry } from '@nestjs/schedule'
import { CronJob } from 'cron'
import { PrismaService } from '../../prisma/prisma.service.js'
import { AddressType, LogType, LogStatus, type Source } from '@multipass/prisma'
import { ExportService } from '../export/export.service.js'
import { TaskTrackerService } from '../tasks/task-tracker.service.js'

// Strict patterns — each octet 0-255, prefix 0-32, etc.
const OCTET = '(?:25[0-5]|2[0-4]\\d|1\\d{2}|[1-9]\\d|\\d)'
const IPv4 = `(?:${OCTET}\\.){3}${OCTET}`
const SUBNET_RE = new RegExp(`^${IPv4}\\/(?:3[0-2]|[12]\\d|\\d)$`)
const RANGE_RE = new RegExp(`^${IPv4}-${IPv4}$`)
const IP_RE = new RegExp(`^${IPv4}$`)
// Domain: at least one dot, valid chars, no leading/trailing hyphen per label
const DOMAIN_RE = /^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/

type ParsedEntry = { value: string; type: AddressType }

function classifyToken(token: string): ParsedEntry | null {
  if (SUBNET_RE.test(token)) return { value: token, type: AddressType.SUBNET }
  if (RANGE_RE.test(token)) return { value: token, type: AddressType.RANGE }
  if (IP_RE.test(token)) return { value: token, type: AddressType.IP }
  if (DOMAIN_RE.test(token)) return { value: token, type: AddressType.DOMAIN }
  return null // not a recognisable address — skip
}

function parsePlainText(text: string): ParsedEntry[] {
  const seen = new Set<string>()
  const entries: ParsedEntry[] = []
  for (const raw of text.split('\n')) {
    // strip inline comments (# and ;) then take first whitespace-delimited token
    const withoutComment = raw.replace(/[#;].*$/, '').trim()
    if (!withoutComment) continue
    const token = withoutComment.split(/\s+/)[0] ?? ''
    const entry = classifyToken(token)
    if (entry && !seen.has(entry.value)) {
      seen.add(entry.value)
      entries.push(entry)
    }
  }
  return entries
}

@Injectable()
export class SourceFetcherService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(SourceFetcherService.name)

  constructor(
    private readonly prisma: PrismaService,
    private readonly schedulerRegistry: SchedulerRegistry,
    private readonly exportService: ExportService,
    private readonly taskTracker: TaskTrackerService,
  ) {}

  async onModuleInit() {
    const sources = await this.prisma.source.findMany({ where: { isEnabled: true } })
    let scheduled = 0
    for (const source of sources) {
      try {
        this.scheduleSource(source)
        scheduled++
      } catch (err) {
        this.logger.error(`Failed to schedule source "${source.name}" (${source.id}): ${String(err)}`)
      }
    }
    this.logger.log(`Scheduled ${scheduled}/${sources.length} source fetch job(s)`)
  }

  onModuleDestroy() {
    const jobs = this.schedulerRegistry.getCronJobs()
    for (const [name] of jobs) {
      if (name.startsWith('source-fetch-')) {
        this.schedulerRegistry.deleteCronJob(name)
      }
    }
  }

  scheduleSource(source: Source) {
    const jobName = `source-fetch-${source.id}`
    try {
      this.schedulerRegistry.deleteCronJob(jobName)
    } catch {
      // job doesn't exist yet — that's fine
    }

    let job: InstanceType<typeof CronJob>
    try {
      job = CronJob.from({
        cronTime: source.updateInterval,
        onTick: () => {
          this.fetchSource(source.id).catch(err => {
            this.logger.error(`Unhandled error fetching source ${source.id}: ${String(err)}`)
          })
        },
        start: true,
      })
    } catch (err) {
      throw new Error(`Invalid cron expression "${source.updateInterval}": ${String(err)}`)
    }

    // cron@4 is a direct dep; @nestjs/schedule internally uses cron@3 — types differ at minor level
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this.schedulerRegistry.addCronJob(jobName, job as any)
    this.logger.log(`Scheduled source "${source.name}" [${source.updateInterval}]`)
  }

  removeSchedule(sourceId: string) {
    const jobName = `source-fetch-${sourceId}`
    try {
      this.schedulerRegistry.deleteCronJob(jobName)
    } catch {
      // already removed or never scheduled
    }
  }

  async fetchSource(sourceId: string): Promise<void> {
    const source = await this.prisma.source.findUnique({ where: { id: sourceId } })
    if (!source || !source.isEnabled) return

    const startedAt = new Date()
    const taskId = this.taskTracker.start(LogType.SOURCE_FETCH, sourceId, source.name)
    this.logger.log(`Fetching source "${source.name}" from ${source.url}`)

    try {
      let rawText: string
      try {
        const response = await fetch(source.url)
        if (!response.ok) {
          throw new Error(`HTTP ${response.status} ${response.statusText}`)
        }
        rawText = await response.text()
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err)
        this.logger.warn(`Failed to fetch source "${source.name}": ${errorMessage}`)

        await Promise.all([
          this.prisma.updateLog.create({
            data: {
              type: LogType.SOURCE_FETCH,
              sourceId,
              status: LogStatus.FAILURE,
              errorMessage,
              startedAt,
              completedAt: new Date(),
            },
          }),
          this.prisma.source.update({
            where: { id: sourceId },
            data: { lastStatus: LogStatus.FAILURE, lastErrorMessage: errorMessage },
          }),
        ])
        return
      }

      const parsed = parsePlainText(rawText)

      const entriesRemoved = source.entryCount
      const newAddresses = parsed.map(({ value, type }) => ({ sourceId, value, type }))

      const CHUNK_SIZE = 5_000
      await this.prisma.$transaction(
        async (tx) => {
          await tx.sourceAddress.deleteMany({ where: { sourceId } })
          for (let i = 0; i < newAddresses.length; i += CHUNK_SIZE) {
            await tx.sourceAddress.createMany({ data: newAddresses.slice(i, i + CHUNK_SIZE) })
          }
          await tx.source.update({
            where: { id: sourceId },
            data: {
              lastFetchedAt: new Date(),
              lastStatus: LogStatus.SUCCESS,
              lastErrorMessage: null,
              entryCount: newAddresses.length,
            },
          })
          await tx.updateLog.create({
            data: {
              type: LogType.SOURCE_FETCH,
              sourceId,
              status: LogStatus.SUCCESS,
              entriesAdded: newAddresses.length,
              entriesRemoved,
              startedAt,
              completedAt: new Date(),
            },
          })
        },
        { timeout: 120_000 },
      )

      this.logger.log(
        `Source "${source.name}" fetched: ${newAddresses.length} entries (+${newAddresses.length} / -${entriesRemoved})`,
      )
      this.exportService.invalidateCache()
    } finally {
      this.taskTracker.finish(taskId)
    }
  }
}
