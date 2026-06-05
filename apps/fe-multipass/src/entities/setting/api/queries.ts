import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/shared/api/client.js'
import type { Setting } from '@multipass/shared'

export const settingKeys = {
  all: ['settings'] as const,
}

export const useSettings = () =>
  useQuery({
    queryKey: settingKeys.all,
    queryFn: () => apiClient.get<Setting[]>('/settings').then((r) => r.data),
  })

export const useUpdateSetting = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ key, value }: { key: string; value: string }) =>
      apiClient.put<Setting>(`/settings/${key}`, { value }).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: settingKeys.all }),
  })
}
