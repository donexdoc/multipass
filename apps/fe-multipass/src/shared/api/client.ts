import axios from 'axios'
import { useAuthStore } from '../lib/auth.js'

export const apiClient = axios.create({
  baseURL: import.meta.env['VITE_API_URL'] ?? '/api',
})

// Attach access token to every request
apiClient.interceptors.request.use(config => {
  const token = useAuthStore.getState().accessToken
  if (token) config.headers['Authorization'] = `Bearer ${token}`
  return config
})

// On 401: try refresh → retry, else clear tokens and redirect to /login
// Auth endpoints themselves must not trigger refresh (avoids loop on bad credentials)
apiClient.interceptors.response.use(
  response => response,
  async error => {
    const originalRequest = error.config
    const isAuthEndpoint = (originalRequest.url as string)?.includes('/auth/')
    if (error.response?.status === 401 && !originalRequest._retry && !isAuthEndpoint) {
      originalRequest._retry = true
      try {
        const refreshToken = useAuthStore.getState().refreshToken
        const { data } = await axios.post('/api/auth/refresh', { refreshToken })
        useAuthStore.getState().setTokens(data.accessToken, data.refreshToken)
        originalRequest.headers['Authorization'] = `Bearer ${data.accessToken}`
        return apiClient(originalRequest)
      } catch {
        useAuthStore.getState().clearTokens()
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  },
)
