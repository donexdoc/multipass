import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/shared/api/client.js'
import type { User, CreateUserDto, UpdateUserDto } from '@multipass/shared'

export const userKeys = {
  all: ['users'] as const,
  byList: (includeInactive: boolean) => ['users', { includeInactive }] as const,
}

export const useUsers = (includeInactive = false) =>
  useQuery({
    queryKey: userKeys.byList(includeInactive),
    queryFn: () =>
      apiClient
        .get<User[]>('/users', { params: { includeInactive } })
        .then((r) => r.data),
  })

export const useCreateUser = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (dto: CreateUserDto) =>
      apiClient.post<User>('/users', dto).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: userKeys.all }),
  })
}

export const useUpdateUser = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: UpdateUserDto }) =>
      apiClient.patch<User>(`/users/${id}`, dto).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: userKeys.all }),
  })
}

export const useDeleteUser = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      apiClient.delete<User>(`/users/${id}`).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: userKeys.all }),
  })
}
