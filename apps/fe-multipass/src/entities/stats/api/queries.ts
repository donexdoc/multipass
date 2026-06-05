import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/shared/api/client.js'
import type { DashboardStats } from '@multipass/shared'

export const statsKeys = {
  all: ['stats'] as const,
}

export const useStats = () =>
  useQuery({
    queryKey: statsKeys.all,
    queryFn: () => apiClient.get<DashboardStats>('/stats').then((r) => r.data),
    refetchInterval: 30_000,
  })
