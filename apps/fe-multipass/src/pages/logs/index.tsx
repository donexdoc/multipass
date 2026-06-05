import { useState, useMemo } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import type { UpdateLog, LogType, LogStatus } from '@multipass/shared'
import { useLogs } from '@/entities/log/index.js'
import { DataTable } from '@/shared/ui/data-table.js'
import { Badge } from '@/shared/ui/badge.js'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select.js'
import { CheckCircle2, XCircle, Clock } from 'lucide-react'
import { cn } from '@/shared/lib/utils.js'

type TypeFilter = LogType | 'all'
type StatusFilter = LogStatus | 'all'

const columns: ColumnDef<UpdateLog>[] = [
  {
    accessorKey: 'type',
    header: 'Тип',
    cell: ({ getValue }) => {
      const v = getValue<LogType>()
      return (
        <Badge variant="outline" className="text-xs">
          {v === 'SOURCE_FETCH' ? 'Источник' : 'Резолвер'}
        </Badge>
      )
    },
  },
  {
    accessorKey: 'sourceName',
    header: 'Источник',
    cell: ({ getValue }) => {
      const v = getValue<string | null>()
      return v ? (
        <span className="text-sm">{v}</span>
      ) : (
        <span className="text-xs text-muted-foreground">—</span>
      )
    },
  },
  {
    accessorKey: 'status',
    header: 'Статус',
    cell: ({ getValue }) => {
      const v = getValue<LogStatus>()
      return (
        <Badge
          variant="outline"
          className={cn(
            'text-xs gap-1',
            v === 'SUCCESS'
              ? 'border-green-500/40 text-green-600 dark:text-green-400'
              : 'border-destructive/40 text-destructive',
          )}
        >
          {v === 'SUCCESS' ? <CheckCircle2 size={11} /> : <XCircle size={11} />}
          {v === 'SUCCESS' ? 'Успешно' : 'Ошибка'}
        </Badge>
      )
    },
  },
  {
    accessorKey: 'entriesAdded',
    header: '+',
    cell: ({ getValue }) => {
      const v = getValue<number>()
      return v > 0 ? (
        <span className="text-xs text-green-600 dark:text-green-400 tabular-nums">+{v}</span>
      ) : (
        <span className="text-xs text-muted-foreground">0</span>
      )
    },
  },
  {
    accessorKey: 'entriesRemoved',
    header: '−',
    cell: ({ getValue }) => {
      const v = getValue<number>()
      return v > 0 ? (
        <span className="text-xs text-destructive tabular-nums">−{v}</span>
      ) : (
        <span className="text-xs text-muted-foreground">0</span>
      )
    },
  },
  {
    accessorKey: 'startedAt',
    header: 'Время',
    cell: ({ getValue }) => (
      <span className="text-xs text-muted-foreground flex items-center gap-1">
        <Clock size={11} />
        {new Date(getValue<string>()).toLocaleString('ru-RU')}
      </span>
    ),
  },
  {
    accessorKey: 'errorMessage',
    header: 'Ошибка',
    cell: ({ getValue }) => {
      const v = getValue<string | null>()
      return v ? (
        <span className="text-xs text-destructive max-w-xs truncate block" title={v}>{v}</span>
      ) : null
    },
  },
]

export function Component() {
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')

  const { data: allLogs = [], isLoading } = useLogs({ type: typeFilter })

  const logs = useMemo(() => {
    if (statusFilter === 'all') return allLogs
    return allLogs.filter((l) => l.status === statusFilter)
  }, [allLogs, statusFilter])

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Логи</h1>
        <p className="text-sm text-muted-foreground mt-0.5">История обновлений источников и DNS-резолвера</p>
      </div>

      <div className="flex items-center gap-3">
        <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as TypeFilter)}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все типы</SelectItem>
            <SelectItem value="SOURCE_FETCH">Источники</SelectItem>
            <SelectItem value="DOMAIN_RESOLVE">Резолвер</SelectItem>
          </SelectContent>
        </Select>

        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все статусы</SelectItem>
            <SelectItem value="SUCCESS">Успешные</SelectItem>
            <SelectItem value="FAILURE">Ошибки</SelectItem>
          </SelectContent>
        </Select>

        <span className="text-xs text-muted-foreground">{logs.length} записей</span>
      </div>

      <DataTable
        columns={columns}
        data={logs}
        isLoading={isLoading}
        emptyTitle="Логи не найдены"
        emptyDescription="Запустите источник или резолвер, чтобы появились записи"
      />
    </div>
  )
}
