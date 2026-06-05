import { Menu, Sun, Moon, LogOut, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/shared/ui/button.js'
import { useThemeStore } from '@/shared/lib/theme.js'
import { useAuthStore } from '@/shared/lib/auth.js'
import { useRunResolver } from '@/entities/resolver/index.js'
import { useNavigate } from 'react-router'

interface HeaderProps {
  onMenuClick: () => void
}

export function Header({ onMenuClick }: HeaderProps) {
  const { theme, toggle } = useThemeStore()
  const clearTokens = useAuthStore((s) => s.clearTokens)
  const navigate = useNavigate()
  const { mutate: runResolver, isPending: isResolving } = useRunResolver()

  const handleLogout = () => {
    clearTokens()
    navigate('/login')
  }

  const handleRunResolver = () => {
    runResolver(undefined, {
      onSuccess: () => {
        toast.success('Резолвер запущен в фоне')
      },
      onError: () => toast.error('Не удалось запустить резолвер'),
    })
  }

  return (
    <header className="flex h-14 items-center justify-between border-b border-border bg-card px-4">
      <Button
        variant="ghost"
        size="icon"
        className="lg:hidden"
        onClick={onMenuClick}
      >
        <Menu size={20} />
      </Button>

      <div className="flex-1 lg:ml-0" />

      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleRunResolver}
          disabled={isResolving}
          title="Запустить DNS-резолвер"
          className="gap-1.5 text-xs text-muted-foreground"
        >
          <RefreshCw size={14} className={isResolving ? 'animate-spin' : ''} />
          {isResolving ? 'Резолвер...' : 'Резолвер'}
        </Button>

        <div className="w-px h-4 bg-border mx-1" />

        <Button variant="ghost" size="icon" onClick={toggle} title="Переключить тему">
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </Button>
        <Button variant="ghost" size="icon" onClick={handleLogout} title="Выйти">
          <LogOut size={18} />
        </Button>
      </div>
    </header>
  )
}
