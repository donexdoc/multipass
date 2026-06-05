// ─── Runtime: address validation ────────────────────────────────────────────
// Kept inline because shared has no build step — Node loads index.ts directly
// via type stripping, and cross-file runtime imports (.js → .ts) don't resolve.

const OCTET = '(?:25[0-5]|2[0-4]\\d|1\\d{2}|[1-9]\\d|\\d)'
const IPv4 = `(?:${OCTET}\\.){3}${OCTET}`

export const ADDRESS_PATTERNS = {
  IP: new RegExp(`^${IPv4}$`),
  SUBNET: new RegExp(`^${IPv4}\\/(?:3[0-2]|[12]\\d|\\d)$`),
  RANGE: new RegExp(`^${IPv4}-${IPv4}$`),
  DOMAIN: /^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/,
} as const

export type AddressTypeKey = keyof typeof ADDRESS_PATTERNS

export function validateAddressValue(value: string, type: string): boolean {
  const pattern = ADDRESS_PATTERNS[type as AddressTypeKey]
  return pattern ? pattern.test(value) : false
}

export const ADDRESS_TYPE_LABELS: Record<AddressTypeKey, string> = {
  IP: 'IPv4-адрес (например: 1.2.3.4)',
  SUBNET: 'подсеть (например: 10.0.0.0/8)',
  RANGE: 'диапазон (например: 1.2.3.0-1.2.3.255)',
  DOMAIN: 'домен (например: example.com)',
}

// ─── Types ───────────────────────────────────────────────────────────────────

export type { AddressType, SourceFormat, LogStatus, LogType } from './enums.js'
export type { User, CreateUserDto, UpdateUserDto, LoginDto, AuthTokens } from './types/user.js'
export type { Source, CreateSourceDto, UpdateSourceDto } from './types/source.js'
export type { CustomEntry, CreateCustomEntryDto, UpdateCustomEntryDto } from './types/entry.js'
export type { ExportFormat, CreateExportFormatDto, UpdateExportFormatDto } from './types/export-format.js'
export type { Setting, UpdateSettingDto } from './types/setting.js'
export type { UpdateLog } from './types/log.js'
export type { DashboardStats, ExportFormatBrief, LastFetchStat, LastResolveStat } from './types/stats.js'
