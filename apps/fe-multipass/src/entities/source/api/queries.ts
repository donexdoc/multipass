import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/shared/api/client.js'
import type { Source, CreateSourceDto, UpdateSourceDto } from '@multipass/shared'

export const sourceKeys = {
  all: ['sources'] as const,
  byList: (includeInactive: boolean) => ['sources', { includeInactive }] as const,
}

export const useSources = (includeInactive = false) =>
  useQuery({
    queryKey: sourceKeys.byList(includeInactive),
    queryFn: () =>
      apiClient
        .get<Source[]>('/sources', { params: { includeInactive } })
        .then((r) => r.data),
  })

export const useCreateSource = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (dto: CreateSourceDto) =>
      apiClient.post<Source>('/sources', dto).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: sourceKeys.all }),
  })
}

export const useUpdateSource = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: UpdateSourceDto }) =>
      apiClient.patch<Source>(`/sources/${id}`, dto).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: sourceKeys.all }),
  })
}

export const useDeleteSource = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      apiClient.delete<Source>(`/sources/${id}`).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: sourceKeys.all }),
  })
}

export const useFetchSource = () =>
  useMutation({
    mutationFn: (id: string) =>
      apiClient.post(`/sources/${id}/refresh`).then((r) => r.data),
  })
