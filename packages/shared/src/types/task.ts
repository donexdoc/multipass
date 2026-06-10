import type { LogType } from '../enums.js'

export interface RunningTask {
  id: string
  type: LogType
  sourceId: string | null
  sourceName: string | null
  startedAt: string
}
