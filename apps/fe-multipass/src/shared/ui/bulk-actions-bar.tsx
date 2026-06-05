import { Button } from './button.js'
import { X } from 'lucide-react'

interface BulkAction {
  label: string
  onClick: () => void
  variant?: 'default' | 'destructive' | 'outline'
  isPending?: boolean
}

interface BulkActionsBarProps {
  selectedCount: number
  total: number
  onClear: () => void
  actions: BulkAction[]
}

export function BulkActionsBar({ selectedCount, total, onClear, actions }: BulkActionsBarProps) {
  if (selectedCount === 0) return null

  return (
    <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2">
      <div className="flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-2.5 shadow-lg">
        <span className="text-sm text-muted-foreground">
          Выбрано: <span className="font-medium text-foreground">{selectedCount}</span> из {total}
        </span>

        <div className="h-4 w-px bg-border" />

        <div className="flex items-center gap-2">
          {actions.map((action, i) => (
            <Button
              key={i}
              size="sm"
              variant={action.variant ?? 'default'}
              onClick={action.onClick}
              disabled={action.isPending}
            >
              {action.isPending ? 'Загрузка...' : action.label}
            </Button>
          ))}
        </div>

        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClear}>
          <X size={14} />
        </Button>
      </div>
    </div>
  )
}
