export interface ExportFormatBrief {
  id: string
  name: string
  slug: string
  contentType: string
}

export interface LastFetchStat {
  status: 'SUCCESS' | 'FAILURE'
  completedAt: string | null
  sourceName: string | null
  entriesAdded: number
  entriesRemoved: number
}

export interface LastResolveStat {
  status: 'SUCCESS' | 'FAILURE'
  completedAt: string | null
  entriesAdded: number
}

export interface DashboardStats {
  /** IP/SUBNET/RANGE из source_addresses + custom_entries (enabled) + resolved_ips */
  totalAddresses: number
  /** IP/SUBNET/RANGE из source_addresses */
  sourceAddresses: number
  /** IP/SUBNET/RANGE из custom_entries (isEnabled=true) */
  customAddresses: number
  /** Записей в resolved_ips */
  resolvedIps: number
  /** Домены из обеих таблиц (для резолвинга) */
  domainsCount: number
  /** Источники с isEnabled=true */
  activeSources: number
  /** Источники с lastStatus=FAILURE */
  sourcesWithErrors: number
  /** custom_entries с isEnabled=true */
  customEntriesCount: number
  /** Последний лог SOURCE_FETCH */
  lastSourceFetch: LastFetchStat | null
  /** Последний лог DOMAIN_RESOLVE */
  lastDomainResolve: LastResolveStat | null
  /** Активные форматы экспорта */
  exportFormats: ExportFormatBrief[]
}
