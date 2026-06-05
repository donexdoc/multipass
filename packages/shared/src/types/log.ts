import type { LogStatus, LogType } from '../enums.js'

export interface UpdateLog {
  id: string
  type: LogType
  sourceId: string | null
  sourceName: string | null
  status: LogStatus
  entriesAdded: number
  entriesRemoved: number
  errorMessage: string | null
  startedAt: string
  completedAt: string | null
  createdAt: string
}
