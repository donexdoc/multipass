import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/shared/api/client.js'
import { logKeys } from '@/entities/log/index.js'

export const useRunResolver = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () =>
      apiClient.post<{ message: string }>('/resolver/run').then((r) => r.data),
    onSuccess: () => {
      // Resolution runs in background — wait a moment before refreshing logs
      setTimeout(() => {
        qc.invalidateQueries({ queryKey: logKeys.all })
      }, 3000)
    },
  })
}
