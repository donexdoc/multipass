import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service.js'
import { SETTINGS_DEFAULTS, type SettingKey } from './settings.constants.js'

@Injectable()
export class SettingsService {
  constructor(private readonly prisma: PrismaService) {}

  async get(key: SettingKey): Promise<string> {
    const row = await this.prisma.setting.findUnique({ where: { key } })
    return row?.value ?? SETTINGS_DEFAULTS[key]
  }

  async getAll() {
    const rows = await this.prisma.setting.findMany()
    const dbMap = new Map(rows.map(r => [r.key, r]))

    return (Object.keys(SETTINGS_DEFAULTS) as SettingKey[]).map(key => {
      const row = dbMap.get(key)
      return {
        key,
        value: row?.value ?? SETTINGS_DEFAULTS[key],
        description: row?.description ?? null,
        updatedAt: row?.updatedAt.toISOString() ?? null,
        isDefault: !row,
      }
    })
  }

  async set(key: string, value: string) {
    if (!(key in SETTINGS_DEFAULTS)) {
      throw new NotFoundException(`Setting '${key}' not found`)
    }
    const typedKey = key as SettingKey
    const row = await this.prisma.setting.upsert({
      where: { key: typedKey },
      create: { key: typedKey, value },
      update: { value },
    })
    return {
      key: row.key,
      value: row.value,
      description: row.description,
      updatedAt: row.updatedAt.toISOString(),
      isDefault: false,
    }
  }
}
