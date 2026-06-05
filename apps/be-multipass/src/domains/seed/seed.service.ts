import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common'
import * as bcrypt from 'bcrypt'
import { PrismaService } from '../../prisma/prisma.service.js'

const SEED_SOURCES = [
  {
    name: 'Blacklist (sanmai)',
    url: 'https://raw.githubusercontent.com/sanmai/blacklist/refs/heads/master/blacklist.txt',
    updateInterval: '0 */6 * * *',
  },
  {
    name: 'Antifilter IP',
    url: 'https://antifilter.download/list/ip.lst',
    updateInterval: '0 */6 * * *',
  },
] as const

const SEED_EXPORT_FORMAT = {
  name: 'MikroTik',
  slug: 'mikrotik',
  header: '/ip firewall address-list remove [find list=to_vpn comment~"auto"]',
  lineTemplate: '/ip firewall address-list add list=to_vpn address={address} comment="auto" timeout=1d',
  contentType: 'text/plain',
} as const

@Injectable()
export class SeedService implements OnApplicationBootstrap {
  private readonly logger = new Logger(SeedService.name)

  constructor(private readonly prisma: PrismaService) {}

  async onApplicationBootstrap() {
    const isFirstRun = await this.seedAdmin()
    if (isFirstRun) {
      await this.seedSources()
      await this.seedExportFormat()
    }
  }

  private async seedAdmin(): Promise<boolean> {
    const login = process.env['ADMIN_LOGIN']
    const password = process.env['ADMIN_PASSWORD']

    if (!login || !password) {
      this.logger.warn('ADMIN_LOGIN or ADMIN_PASSWORD not set — skipping seed')
      return false
    }

    const existing = await this.prisma.user.findUnique({ where: { login } })
    if (existing) return false

    const passwordHash = await bcrypt.hash(password, 10)
    await this.prisma.user.create({ data: { login, passwordHash } })
    this.logger.log(`Admin user "${login}" created`)
    return true
  }

  private async seedSources() {
    for (const data of SEED_SOURCES) {
      const existing = await this.prisma.source.findFirst({ where: { url: data.url } })
      if (!existing) {
        await this.prisma.source.create({ data })
        this.logger.log(`Source "${data.name}" created`)
      }
    }
  }

  private async seedExportFormat() {
    const existing = await this.prisma.exportFormat.findUnique({
      where: { slug: SEED_EXPORT_FORMAT.slug },
    })
    if (!existing) {
      await this.prisma.exportFormat.create({ data: SEED_EXPORT_FORMAT })
      this.logger.log(`Export format "${SEED_EXPORT_FORMAT.name}" created`)
    }
  }
}
