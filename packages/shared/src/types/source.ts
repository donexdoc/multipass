import type { LogStatus, SourceFormat } from '../enums.js'

export interface Source {
  id: string
  name: string
  url: string
  format: SourceFormat
  updateInterval: string
  isEnabled: boolean
  lastFetchedAt: string | null
  lastStatus: LogStatus | null
  lastErrorMessage: string | null
  entryCount: number
  createdAt: string
  updatedAt: string
}

export interface CreateSourceDto {
  name: string
  url: string
  format?: SourceFormat
  updateInterval: string
}

export interface UpdateSourceDto {
  name?: string
  url?: string
  format?: SourceFormat
  updateInterval?: string
  isEnabled?: boolean
}
