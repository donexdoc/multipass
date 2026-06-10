import { CheckCircle2, XCircle, Copy, ExternalLink, AlertTriangle, Loader2, Radio } from 'lucide-react'
import { toast } from 'sonner'
import { Card } from '@/shared/ui/card.js'
import { Badge } from '@/shared/ui/badge.js'
import { Skeleton } from '@/shared/ui/skeleton.js'
import { Button } from '@/shared/ui/button.js'
import { cn } from '@/shared/lib/utils.js'
import { useStats } from '@/entities/stats/index.js'
import { useRunningTasks } from '@/entities/task/index.js'
import { useBgpStatus } from '@/entities/bgp/index.js'
import type { DashboardStats, LastFetchStat, LastResolveStat, RunningTask, BgpStatus } from '@multipass/shared'

function fmt(n: number | undefined) {
  return n === undefined ? null : n.toLocaleString('ru-RU')
}

function fmtTime(iso: string | null | undefined) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('ru-RU')
}

// ─── Stat tile ───────────────────────────────────────────────────────────────

interface StatTileProps {
  label: string
  value: number | undefined
  sub?: string
  alert?: boolean
}

function StatTile({ label, value, sub, alert }: StatTileProps) {
  return (
    <Card className="py-4 gap-1.5">
      <div className="px-4 text-xs font-medium text-muted-foreground">{label}</div>
      <div
        className={cn(
          'px-4 text-2xl font-semibold tabular-nums leading-none',
          alert && value ? 'text-destructive' : '',
        )}
      >
        {value === undefined ? <Skeleton className="h-7 w-16 mt-0.5" /> : fmt(value)}
      </div>
      {sub !== undefined && (
        <div className="px-4 text-xs text-muted-foreground">{sub}</div>
      )}
    </Card>
  )
}

// ─── Status card ─────────────────────────────────────────────────────────────

interface StatusCardProps {
  label: string
  data: LastFetchStat | LastResolveStat | null | undefined
  detail?: string
}

function StatusCard({ label, data, detail }: StatusCardProps) {
  return (
    <Card className="py-4 gap-3">
      <div className="px-4 text-xs font-medium text-muted-foreground">{label}</div>
      <div className="px-4 space-y-1">
        {data === undefined ? (
          <>
            <Skeleton className="h-5 w-20" />
            <Skeleton className="h-4 w-32" />
          </>
        ) : data === null ? (
          <span className="text-sm text-muted-foreground">Нет данных</span>
        ) : (
          <>
            <div
              className={cn(
                'flex items-center gap-1.5 text-sm font-medium',
                data.status === 'SUCCESS'
                  ? 'text-green-600 dark:text-green-400'
                  : 'text-destructive',
              )}
            >
              {data.status === 'SUCCESS' ? (
                <CheckCircle2 size={14} />
              ) : (
                <XCircle size={14} />
              )}
              {data.status === 'SUCCESS' ? 'Успешно' : 'Ошибка'}
            </div>
            {detail && <div className="text-sm text-foreground">{detail}</div>}
            <div className="text-xs text-muted-foreground">{fmtTime(data.completedAt)}</div>
          </>
        )}
      </div>
    </Card>
  )
}

// ─── Running tasks ────────────────────────────────────────────────────────────

function RunningTasksCard({ tasks }: { tasks: RunningTask[] }) {
  if (tasks.length === 0) return null

  return (
    <Card className="py-4 gap-3 border-blue-500/40 bg-blue-500/5">
      <div className="px-4 flex items-center gap-2 text-xs font-medium text-blue-600 dark:text-blue-400">
        <Loader2 size={12} className="animate-spin" />
        Выполняется прямо сейчас
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

// ─── BGP status card ──────────────────────────────────────────────────────────

function BgpCard({ bgp, isLoading }: { bgp: BgpStatus | undefined; isLoading: boolean }) {
  return (
    <Card className="py-4 gap-3">
      <div className="px-4 flex items-center gap-2 text-xs font-medium text-muted-foreground">
        <Radio size={12} />
        BGP
      </div>
      <div className="px-4 space-y-2">
        {isLoading ? (
          <>
            <Skeleton className="h-5 w-20" />
            <Skeleton className="h-4 w-28" />
          </>
        ) : (
          <>
            <div className="flex items-center gap-2 flex-wrap">
              {bgp?.isEnabled ? (
                <Badge className="gap-1.5 text-xs bg-green-600 hover:bg-green-600">
                  <CheckCircle2 size={10} />
                  Включён
                </Badge>
              ) : (
                <Badge variant="secondary" className="gap-1.5 text-xs">
                  <XCircle size={10} />
                  Отключён
                </Badge>
              )}
              {bgp?.isEnabled && (
                bgp.isConnected ? (
                  <Badge variant="outline" className="gap-1.5 text-xs text-blue-600 border-blue-600/40">
                    <CheckCircle2 size={10} />
                    GoBGP ок
                  </Badge>
                ) : (
                  <Badge variant="outline" className="gap-1.5 text-xs text-destructive border-destructive/40">
                    <XCircle size={10} />
                    GoBGP недоступен
                  </Badge>
                )
              )}
            </div>
            {bgp?.isEnabled && bgp.isConnected && (
              <span className="text-sm tabular-nums text-muted-foreground">
                {(bgp.announcedCount).toLocaleString('ru-RU')} префиксов
              </span>
            )}
            {bgp?.lastError && (
              <div className="text-xs text-destructive flex items-start gap-1">
                <AlertTriangle size={11} className="shrink-0 mt-0.5" />
                {bgp.lastError}
              </div>
            )}
            {bgp?.isEnabled && bgp.lastSyncAt && !bgp.lastError && (
              <div className="text-xs text-muted-foreground">
                Синхр. {new Date(bgp.lastSyncAt).toLocaleString('ru-RU')}
              </div>
            )}
            {!bgp?.isEnabled && (
              <div className="text-xs text-muted-foreground">
                <a href="/bgp" className="underline underline-offset-2 hover:text-foreground">
                  Настроить BGP →
                </a>
              </div>
            )}
          </>
        )}
      </div>
    </Card>
  )
}

// ─── Export formats ───────────────────────────────────────────────────────────

function ExportFormatsCard({ formats }: { formats: DashboardStats['exportFormats'] | undefined }) {
  return (
    <Card className="py-4 gap-3">
      <div className="px-4 text-xs font-medium text-muted-foreground">Форматы экспорта</div>
      <div className="px-4">
        {formats === undefined ? (
          <div className="space-y-2">
            <Skeleton className="h-5 w-full" />
            <Skeleton className="h-5 w-3/4" />
          </div>
        ) : formats.length === 0 ? (
          <span className="text-sm text-muted-foreground">Нет активных форматов</span>
        ) : (
          <div className="space-y-2">
            {formats.map((fmt) => {
              const url = `/api/export/${fmt.slug}`
              return (
                <div key={fmt.id} className="flex items-center gap-2 min-w-0">
                  <span className="text-sm font-medium w-28 shrink-0 truncate">{fmt.name}</span>
                  <code className="text-xs bg-muted px-1.5 py-0.5 rounded flex-1 truncate min-w-0">
                    {url}
                  </code>
                  <Badge variant="outline" className="text-xs shrink-0 hidden sm:flex">
                    {fmt.contentType.replace('text/', '')}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 shrink-0"
                    title="Скопировать URL"
                    onClick={() => {
                      void navigator.clipboard.writeText(window.location.origin + url)
                      toast.success('URL скопирован')
                    }}
                  >
                    <Copy size={12} />
                  </Button>
                  <a href={url} target="_blank" rel="noreferrer" className="shrink-0">
                    <Button variant="ghost" size="icon" className="h-6 w-6" title="Открыть">
                      <ExternalLink size={12} />
                    </Button>
                  </a>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </Card>
  )
}

// ─── Page ────────────────────────────────────────────────────────────────────

export function Component() {
  const { data: stats } = useStats()
  const { data: runningTasks = [] } = useRunningTasks()
  const { data: bgp, isLoading: bgpLoading } = useBgpStatus()

  const lastFetchDetail =
    stats?.lastSourceFetch
      ? [
          stats.lastSourceFetch.sourceName,
          stats.lastSourceFetch.entriesAdded
            ? `+${fmt(stats.lastSourceFetch.entriesAdded)}`
            : null,
          stats.lastSourceFetch.entriesRemoved
            ? `−${fmt(stats.lastSourceFetch.entriesRemoved)}`
            : null,
        ]
          .filter(Boolean)
          .join(' · ')
      : undefined

  const lastResolveDetail =
    stats?.lastDomainResolve?.entriesAdded
      ? `+${fmt(stats.lastDomainResolve.entriesAdded)} IP`
      : undefined

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Общая статистика системы</p>
      </div>

      {/* Row 1: address counters */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatTile
          label="Адресов в экспорте"
          value={stats?.totalAddresses}
          sub={
            stats
              ? `источники ${fmt(stats.sourceAddresses)} · ручные ${fmt(stats.customAddresses)} · resolved ${fmt(stats.resolvedIps)}`
              : undefined
          }
        />
        <StatTile
          label="Активных источников"
          value={stats?.activeSources}
          sub={
            stats?.sourcesWithErrors
              ? `${stats.sourcesWithErrors} с ошибкой`
              : 'всё работает'
          }
          alert={!!stats?.sourcesWithErrors}
        />
        <StatTile
          label="Ручных записей"
          value={stats?.customEntriesCount}
        />
        <StatTile
          label="Доменов на резолве"
          value={stats?.domainsCount}
          sub={stats ? `→ ${fmt(stats.resolvedIps)} IP` : undefined}
        />
      </div>

      {/* Running tasks — visible only when tasks are active */}
      <RunningTasksCard tasks={runningTasks} />

      {/* Row 2: last activity + BGP */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <StatusCard
          label="Последнее обновление источников"
          data={stats?.lastSourceFetch}
          detail={lastFetchDetail}
        />
        <StatusCard
          label="Последний резолвинг доменов"
          data={stats?.lastDomainResolve}
          detail={lastResolveDetail}
        />
        <BgpCard bgp={bgp} isLoading={bgpLoading} />
      </div>

      {/* Row 3: export formats */}
      <ExportFormatsCard formats={stats?.exportFormats} />

      {/* Alert if sources have errors */}
      {stats?.sourcesWithErrors ? (
        <div className="flex items-center gap-2 rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          <AlertTriangle size={15} className="shrink-0" />
          <span>
            {stats.sourcesWithErrors} из {stats.activeSources} источников завершили последнее
            обновление с ошибкой. Проверьте{' '}
            <a href="/logs" className="underline underline-offset-2">
              логи
            </a>
            .
          </span>
        </div>
      ) : null}
    </div>
  )
}
