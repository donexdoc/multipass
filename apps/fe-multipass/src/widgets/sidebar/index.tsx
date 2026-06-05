import { NavLink } from 'react-router'
import {
  LayoutDashboard,
  Globe,
  List,
  FileCode2,
  Eye,
  ScrollText,
  Settings,
  Users,
  X,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react'
import { cn } from '@/shared/lib/utils.js'
import { Button } from '@/shared/ui/button.js'
import { useSidebarStore } from '@/shared/lib/sidebar.js'

const NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/sources', label: 'Источники', icon: Globe },
  { to: '/entries', label: 'Записи', icon: List },
  { to: '/export-formats', label: 'Форматы экспорта', icon: FileCode2 },
  { to: '/export-preview', label: 'Превью экспорта', icon: Eye },
  { to: '/logs', label: 'Логи', icon: ScrollText },
  { to: '/settings', label: 'Настройки', icon: Settings },
  { to: '/users', label: 'Пользователи', icon: Users },
] as const

interface SidebarProps {
  open: boolean
  onClose: () => void
}

export function Sidebar({ open, onClose }: SidebarProps) {
  const { collapsed, toggle } = useSidebarStore()

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 z-20 bg-black/50 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed left-0 top-0 z-30 flex h-full flex-col border-r border-sidebar-border bg-sidebar-background transition-all duration-200',
          collapsed ? 'w-14' : 'w-60',
          'lg:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        {/* Logo + collapse button */}
        <div className="flex h-14 items-center justify-between px-3 border-b border-sidebar-border">
          {!collapsed && (
            <span className="text-sidebar-foreground font-semibold text-base tracking-tight truncate">
              Multipass
            </span>
          )}

          {/* Mobile close */}
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden text-sidebar-foreground shrink-0"
            onClick={onClose}
          >
            <X size={18} />
          </Button>

          {/* Desktop collapse */}
          <Button
            variant="ghost"
            size="icon"
            className="hidden lg:flex text-sidebar-foreground shrink-0"
            onClick={toggle}
            title={collapsed ? 'Развернуть' : 'Свернуть'}
          >
            {collapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
          </Button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-3">
          <ul className="space-y-0.5 px-2">
            {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
              <li key={to}>
                <NavLink
                  to={to}
                  title={collapsed ? label : undefined}
                  onClick={() => {
                    if (window.innerWidth < 1024) onClose()
                  }}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center rounded-md px-2 py-2 text-sm transition-colors',
                      collapsed ? 'justify-center' : 'gap-3 px-3',
                      isActive
                        ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium'
                        : 'text-sidebar-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground',
                    )
                  }
                >
                  <Icon size={16} className="shrink-0" />
                  {!collapsed && label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      </aside>
    </>
  )
}
