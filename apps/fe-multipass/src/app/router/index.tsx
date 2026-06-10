import { createBrowserRouter, Navigate } from 'react-router'
import { AppShell } from '../../widgets/layout/index.js'

function PageLoader() {
  return (
    <div className="flex h-screen items-center justify-center bg-background">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary" />
    </div>
  )
}

export const router = createBrowserRouter([
  {
    path: '/login',
    lazy: () => import('../../pages/login/index.js'),
  },
  {
    path: '/',
    element: <AppShell />,
    HydrateFallback: PageLoader,
    children: [
      { index: true, element: <Navigate to="/dashboard" replace /> },
      { path: 'dashboard', lazy: () => import('../../pages/dashboard/index.js') },
      { path: 'sources', lazy: () => import('../../pages/sources/index.js') },
      { path: 'entries', lazy: () => import('../../pages/entries/index.js') },
      { path: 'export-formats', lazy: () => import('../../pages/export-formats/index.js') },
      { path: 'export-preview', lazy: () => import('../../pages/export-preview/index.js') },
      { path: 'logs', lazy: () => import('../../pages/logs/index.js') },
      { path: 'settings', lazy: () => import('../../pages/settings/index.js') },
      { path: 'users', lazy: () => import('../../pages/users/index.js') },
      { path: 'bgp', lazy: () => import('../../pages/bgp/index.js') },
    ],
  },
])
