import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/shared/api/client.js'
import type { ExportFormat, CreateExportFormatDto, UpdateExportFormatDto } from '@multipass/shared'

export const exportFormatKeys = {
  all: ['export-formats'] as const,
  byList: (includeInactive: boolean) => ['export-formats', { includeInactive }] as const,
}

export const useExportFormats = (includeInactive = false) =>
  useQuery({
    queryKey: exportFormatKeys.byList(includeInactive),
    queryFn: () =>
      apiClient
        .get<ExportFormat[]>('/export-formats', { params: { includeInactive } })
        .then((r) => r.data),
  })

export const useCreateExportFormat = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (dto: CreateExportFormatDto) =>
      apiClient.post<ExportFormat>('/export-formats', dto).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: exportFormatKeys.all }),
  })
}

export const useUpdateExportFormat = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: UpdateExportFormatDto }) =>
      apiClient.patch<ExportFormat>(`/export-formats/${id}`, dto).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: exportFormatKeys.all }),
  })
}

export const useDeleteExportFormat = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      apiClient.delete<ExportFormat>(`/export-formats/${id}`).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: exportFormatKeys.all }),
  })
}
