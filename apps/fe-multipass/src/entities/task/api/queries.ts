import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/shared/api/client.js'
import type { RunningTask } from '@multipass/shared'

export const taskKeys = {
  running: ['tasks', 'running'] as const,
}

export const useRunningTasks = () =>
  useQuery({
    queryKey: taskKeys.running,
    queryFn: () => apiClient.get<RunningTask[]>('/tasks/running').then((r) => r.data),
    refetchInterval: 3_000,
  })
