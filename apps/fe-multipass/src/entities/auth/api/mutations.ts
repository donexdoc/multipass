import { useMutation } from '@tanstack/react-query'
import { apiClient } from '@/shared/api/client.js'
import { useAuthStore } from '@/shared/lib/auth.js'

interface LoginDto {
  login: string
  password: string
}

interface AuthResponse {
  accessToken: string
  refreshToken: string
}

export const useLogin = () => {
  const setTokens = useAuthStore((s) => s.setTokens)

  return useMutation({
    mutationFn: (dto: LoginDto) =>
      apiClient.post<AuthResponse>('/auth/login', dto).then((r) => r.data),
    onSuccess: (data) => {
      setTokens(data.accessToken, data.refreshToken)
    },
  })
}
