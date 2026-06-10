import { useState, useMemo } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import type { UpdateLog, LogType, LogStatus, RunningTask } from '@multipass/shared'
import { useLogs } from '@/entities/log/index.js'
import { useRunningTasks } from '@/entities/task/index.js'
import { DataTable } from '@/shared/ui/data-table.js'
import { Badge } from '@/shared/ui/badge.js'
import { Card } from '@/shared/ui/card.js'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select.js'
import { CheckCircle2, XCircle, Clock, Loader2 } from 'lucide-react'
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

// ─── Running tasks list ───────────────────────────────────────────────────────

function RunningTasksList({ tasks }: { tasks: RunningTask[] }) {
  if (tasks.length === 0) return null

  return (
    <Card className="py-4 gap-3 border-blue-500/40 bg-blue-500/5">
      <div className="px-4 flex items-center gap-2 text-xs font-medium text-blue-600 dark:text-blue-400">
        <Loader2 size={12} className="animate-spin" />
        Выполняется сейчас ({tasks.length})
      </div>
      <div className="px-4 space-y-2">
        {tasks.map((task) => (
          <div key={task.id} className="flex items-center gap-2 text-sm">
            <Badge variant="outline" className="text-xs shrink-0">
              {task.type === 'SOURCE_FETCH' ? 'Источник' : 'Резолвер'}
            </Badge>
            <span className="text-foreground truncate">
              {task.sourceName ?? (task.type === 'DOMAIN_RESOLVE' ? 'DNS-резолвинг' : '—')}
            </span>
            <span className="text-xs text-muted-foreground ml-auto shrink-0">
              с {new Date(task.startedAt).toLocaleTimeString('ru-RU')}
            </span>
          </div>
        ))}
      </div>
    </Card>
  )
}

// ─── Stats bar ────────────────────────────────────────────────────────────────

interface StatsBarProps {
  logs: UpdateLog[]
}

function StatsBar({ logs }: StatsBarProps) {
  const total = logs.length
  const success = logs.filter((l) => l.status === 'SUCCESS').length
  const failure = total - success
  const successRate = total > 0 ? Math.round((success / total) * 100) : null

  return (
    <div className="flex flex-wrap gap-4 text-sm">
      <span className="text-muted-foreground">
        Всего: <span className="text-foreground font-medium tabular-nums">{total}</span>
      </span>
      {successRate !== null && (
        <>
          <span className="text-green-600 dark:text-green-400">
            Успешных: <span className="font-medium tabular-nums">{success}</span>
          </span>
          <span className="text-destructive">
            Ошибок: <span className="font-medium tabular-nums">{failure}</span>
          </span>
          <span
            className={cn(
              'font-medium tabular-nums',
              successRate >= 90
                ? 'text-green-600 dark:text-green-400'
                : successRate >= 70
                  ? 'text-yellow-600 dark:text-yellow-400'
                  : 'text-destructive',
            )}
          >
            {successRate}% успех
          </span>
        </>
      )}
    </div>
  )
}

// ─── Page ────────────────────────────────────────────────────────────────────

export function Component() {
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')

  const { data: allLogs = [], isLoading } = useLogs({ type: typeFilter })
  const { data: runningTasks = [] } = useRunningTasks()

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

      <RunningTasksList tasks={runningTasks} />

      <StatsBar logs={allLogs} />

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
