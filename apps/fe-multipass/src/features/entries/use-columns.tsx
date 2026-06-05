import type { ColumnDef } from '@tanstack/react-table'
import type { CustomEntry } from '@multipass/shared'
import { Pencil, Trash2 } from 'lucide-react'
import { Button } from '@/shared/ui/button.js'
import { Badge } from '@/shared/ui/badge.js'

interface UseColumnsOptions {
  onEdit: (entry: CustomEntry) => void
  onDelete: (entry: CustomEntry) => void
}

export function useEntryColumns({ onEdit, onDelete }: UseColumnsOptions): ColumnDef<CustomEntry>[] {
  return [
    {
      accessorKey: 'value',
      header: 'Адрес',
      cell: ({ getValue }) => (
        <code className="text-sm font-mono">{getValue<string>()}</code>
      ),
    },
    {
      accessorKey: 'type',
      header: 'Тип',
      cell: ({ getValue }) => (
        <Badge variant="outline" className="text-xs">{getValue<string>()}</Badge>
      ),
    },
    {
      accessorKey: 'comment',
      header: 'Комментарий',
      cell: ({ getValue }) => {
        const val = getValue<string | null>()
        return val ? (
          <span className="text-sm text-muted-foreground">{val}</span>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        )
      },
    },
    {
      accessorKey: 'isEnabled',
      header: 'Активна',
      cell: ({ getValue }) => (
        <Badge variant={getValue<boolean>() ? 'default' : 'secondary'} className="text-xs">
          {getValue<boolean>() ? 'Да' : 'Нет'}
        </Badge>
      ),
    },
    {
      accessorKey: 'createdAt',
      header: 'Создана',
      cell: ({ getValue }) => (
        <span className="text-xs text-muted-foreground">
          {new Date(getValue<string>()).toLocaleDateString('ru-RU')}
        </span>
      ),
    },
    {
      id: 'actions',
      cell: ({ row }) => {
        const entry = row.original
        return (
          <div className="flex items-center gap-1 justify-end">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEdit(entry)}>
              <Pencil size={13} />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-destructive hover:text-destructive"
              onClick={() => onDelete(entry)}
            >
              <Trash2 size={13} />
            </Button>
          </div>
        )
      },
    },
  ]
}
