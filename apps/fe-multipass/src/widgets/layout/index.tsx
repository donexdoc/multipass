import { useEffect, useState } from 'react'
import { Outlet, Navigate } from 'react-router'
import { Sidebar } from '../sidebar/index.js'
import { Header } from '../header/index.js'
import { useAuthStore } from '@/shared/lib/auth.js'
import { useSidebarStore } from '@/shared/lib/sidebar.js'
import { cn } from '@/shared/lib/utils.js'
import { apiClient } from '@/shared/api/client.js'

export function AppShell() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated())
  const isVerifying = useAuthStore((s) => s.isVerifying)
  const setVerified = useAuthStore((s) => s.setVerified)
  const clearTokens = useAuthStore((s) => s.clearTokens)
  const collapsed = useSidebarStore((s) => s.collapsed)

  useEffect(() => {
    if (!isVerifying) return
    // Verify stored token is still valid; on any failure — clear tokens and redirect to login
    apiClient.get('/settings').then(() => setVerified()).catch(() => clearTokens())
  }, [isVerifying, setVerified, clearTokens])

  if (isVerifying) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary" />
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div
        className={cn(
          'flex flex-1 flex-col overflow-hidden transition-all duration-200',
          collapsed ? 'lg:pl-14' : 'lg:pl-60',
        )}
      >
        <Header onMenuClick={() => setSidebarOpen(true)} />

        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
