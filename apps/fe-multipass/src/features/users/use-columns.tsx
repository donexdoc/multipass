import type { ColumnDef } from '@tanstack/react-table'
import type { User } from '@multipass/shared'
import { Pencil, Trash2 } from 'lucide-react'
import { Button } from '@/shared/ui/button.js'
import { Badge } from '@/shared/ui/badge.js'

interface UseColumnsOptions {
  onEdit: (user: User) => void
  onDelete: (user: User) => void
}

export function useUserColumns({ onEdit, onDelete }: UseColumnsOptions): ColumnDef<User>[] {
  return [
    {
      accessorKey: 'login',
      header: 'Логин',
      cell: ({ getValue }) => (
        <span className="font-medium text-sm">{getValue<string>()}</span>
      ),
    },
    {
      accessorKey: 'isActive',
      header: 'Активен',
      cell: ({ getValue }) => (
        <Badge variant={getValue<boolean>() ? 'default' : 'secondary'} className="text-xs">
          {getValue<boolean>() ? 'Да' : 'Нет'}
        </Badge>
      ),
    },
    {
      accessorKey: 'createdAt',
      header: 'Создан',
      cell: ({ getValue }) => (
        <span className="text-xs text-muted-foreground">
          {new Date(getValue<string>()).toLocaleDateString('ru-RU')}
        </span>
      ),
    },
    {
      id: 'actions',
      cell: ({ row }) => {
        const user = row.original
        return (
          <div className="flex items-center gap-1 justify-end">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEdit(user)}>
              <Pencil size={13} />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-destructive hover:text-destructive"
              onClick={() => onDelete(user)}
            >
              <Trash2 size={13} />
            </Button>
          </div>
        )
      },
    },
  ]
}
