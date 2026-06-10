import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/shared/api/client.js'
import type { BgpStatus } from '@multipass/shared'

export const bgpKeys = {
  all: ['bgp'] as const,
  status: () => ['bgp', 'status'] as const,
}

export const useBgpStatus = () =>
  useQuery({
    queryKey: bgpKeys.status(),
    queryFn: () => apiClient.get<BgpStatus>('/bgp/status').then((r) => r.data),
    refetchInterval: (query) => (query.state.data?.isSyncing ? 2_000 : 15_000),
  })

export const useBgpSync = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => apiClient.post<BgpStatus>('/bgp/sync').then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: bgpKeys.all }),
  })
}
