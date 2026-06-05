import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/shared/api/client.js'
import type { CustomEntry, CreateCustomEntryDto, UpdateCustomEntryDto } from '@multipass/shared'

export const entryKeys = {
  all: ['entries'] as const,
  byList: (includeInactive: boolean) => ['entries', { includeInactive }] as const,
}

export const useEntries = (includeInactive = false) =>
  useQuery({
    queryKey: entryKeys.byList(includeInactive),
    queryFn: () =>
      apiClient
        .get<CustomEntry[]>('/entries', { params: { includeInactive } })
        .then((r) => r.data),
  })

export const useCreateEntry = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (dto: CreateCustomEntryDto) =>
      apiClient.post<CustomEntry>('/entries', dto).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: entryKeys.all }),
  })
}

export const useUpdateEntry = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: UpdateCustomEntryDto }) =>
      apiClient.patch<CustomEntry>(`/entries/${id}`, dto).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: entryKeys.all }),
  })
}

export const useDeleteEntry = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      apiClient.delete<CustomEntry>(`/entries/${id}`).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: entryKeys.all }),
  })
}
