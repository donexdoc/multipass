import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/shared/api/client.js'
import type { UpdateLog, LogType, LogStatus } from '@multipass/shared'

interface LogsParams {
  type?: LogType | 'all'
  status?: LogStatus | 'all'
  limit?: number
  offset?: number
}

export const logKeys = {
  all: ['logs'] as const,
  byFilter: (params: LogsParams) => ['logs', params] as const,
}

export const useLogs = (params: LogsParams = {}) =>
  useQuery({
    queryKey: logKeys.byFilter(params),
    queryFn: () => {
      const query: Record<string, string | number> = { limit: params.limit ?? 100 }
      if (params.type && params.type !== 'all') query['type'] = params.type
      if (params.offset) query['offset'] = params.offset
      return apiClient.get<UpdateLog[]>('/logs', { params: query }).then((r) => r.data)
    },
  })
