import type { ColumnDef } from '@tanstack/react-table'
import type { Source } from '@multipass/shared'
import { Pencil, Trash2, RefreshCw, CheckCircle2, XCircle, Clock } from 'lucide-react'
import { Button } from '@/shared/ui/button.js'
import { Badge } from '@/shared/ui/badge.js'
import { cn } from '@/shared/lib/utils.js'

interface UseColumnsOptions {
  onEdit: (source: Source) => void
  onDelete: (source: Source) => void
  onFetch: (source: Source) => void
  fetchingId: string | null
}

export function useSourceColumns({
  onEdit,
  onDelete,
  onFetch,
  fetchingId,
}: UseColumnsOptions): ColumnDef<Source>[] {
  return [
    {
      accessorKey: 'name',
      header: 'Название',
      cell: ({ row }) => (
        <div>
          <div className="font-medium text-sm">{row.original.name}</div>
          <div className="text-xs text-muted-foreground truncate max-w-xs">{row.original.url}</div>
        </div>
      ),
    },
    {
      accessorKey: 'updateInterval',
      header: 'Интервал',
      cell: ({ getValue }) => (
        <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{getValue<string>()}</code>
      ),
    },
    {
      accessorKey: 'entryCount',
      header: 'Записей',
      cell: ({ getValue }) => (
        <span className="text-sm tabular-nums">{getValue<number>()}</span>
      ),
    },
    {
      accessorKey: 'lastStatus',
      header: 'Статус',
      cell: ({ row }) => {
        const { lastStatus: status, lastErrorMessage } = row.original
        if (!status) return <span className="text-xs text-muted-foreground">—</span>
        return (
          <div className="space-y-0.5">
            <Badge
              variant="outline"
              className={cn(
                'text-xs gap-1',
                status === 'SUCCESS'
                  ? 'border-green-500/40 text-green-600 dark:text-green-400'
                  : 'border-destructive/40 text-destructive',
              )}
            >
              {status === 'SUCCESS' ? <CheckCircle2 size={11} /> : <XCircle size={11} />}
              {status === 'SUCCESS' ? 'OK' : 'Ошибка'}
            </Badge>
            {status === 'FAILURE' && lastErrorMessage && (
              <p className="text-xs text-destructive/80 max-w-[200px] break-words leading-tight">
                {lastErrorMessage}
              </p>
            )}
          </div>
        )
      },
    },
    {
      accessorKey: 'lastFetchedAt',
      header: 'Последнее обновление',
      cell: ({ getValue }) => {
        const val = getValue<string | null>()
        if (!val) return <span className="text-xs text-muted-foreground">—</span>
        return (
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <Clock size={11} />
            {new Date(val).toLocaleString('ru-RU')}
          </span>
        )
      },
    },
    {
      accessorKey: 'isEnabled',
      header: 'Активен',
      cell: ({ getValue }) => (
        <Badge variant={getValue<boolean>() ? 'default' : 'secondary'} className="text-xs">
          {getValue<boolean>() ? 'Да' : 'Нет'}
        </Badge>
      ),
    },
    {
      id: 'actions',
      cell: ({ row }) => {
        const source = row.original
        const isFetching = fetchingId === source.id
        return (
          <div className="flex items-center gap-1 justify-end">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              title="Обновить сейчас"
              disabled={isFetching}
              onClick={() => onFetch(source)}
            >
              <RefreshCw size={13} className={cn(isFetching && 'animate-spin')} />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              title="Редактировать"
              onClick={() => onEdit(source)}
            >
              <Pencil size={13} />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-destructive hover:text-destructive"
              title="Деактивировать"
              onClick={() => onDelete(source)}
            >
              <Trash2 size={13} />
            </Button>
          </div>
        )
      },
    },
  ]
}
