import { toast } from 'sonner'
import { RefreshCw, Radio, AlertTriangle, CheckCircle2, XCircle } from 'lucide-react'
import { Card } from '@/shared/ui/card.js'
import { Button } from '@/shared/ui/button.js'
import { Badge } from '@/shared/ui/badge.js'
import { Skeleton } from '@/shared/ui/skeleton.js'
import { useBgpStatus, useBgpSync } from '@/entities/bgp/index.js'

function fmtTime(iso: string | null | undefined) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('ru-RU')
}

export function Component() {
  const { data: status, isLoading } = useBgpStatus()
  const { mutate: sync, isPending } = useBgpSync()

  const handleSync = () => {
    sync(undefined, {
      onSuccess: () => toast.info('Синхронизация запущена'),
      onError: () => toast.error('Не удалось запустить синхронизацию'),
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">BGP</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Управление BGP-анонсами через GoBGP
          </p>
        </div>
        <Button
          onClick={handleSync}
          disabled={isPending || isLoading || status?.isSyncing}
          variant="outline"
        >
          <RefreshCw size={14} className={isPending || status?.isSyncing ? 'animate-spin' : ''} />
          {status?.isSyncing ? 'Синхронизация…' : 'Синхронизировать'}
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        {/* Enabled */}
        <Card className="py-4 gap-1.5">
          <div className="px-4 text-xs font-medium text-muted-foreground">Статус</div>
          <div className="px-4">
            {isLoading ? (
              <Skeleton className="h-6 w-20 mt-0.5" />
            ) : status?.isEnabled ? (
              <Badge className="gap-1.5 bg-green-600 hover:bg-green-600">
                <CheckCircle2 size={11} />
                Включён
              </Badge>
            ) : (
              <Badge variant="secondary" className="gap-1.5">
                <XCircle size={11} />
                Отключён
              </Badge>
            )}
          </div>
        </Card>

        {/* Connection */}
        <Card className="py-4 gap-1.5">
          <div className="px-4 text-xs font-medium text-muted-foreground">GoBGP</div>
          <div className="px-4">
            {isLoading ? (
              <Skeleton className="h-6 w-20 mt-0.5" />
            ) : status?.isConnected ? (
              <Badge className="gap-1.5 bg-blue-600 hover:bg-blue-600">
                <CheckCircle2 size={11} />
                Подключён
              </Badge>
            ) : (
              <Badge variant="secondary" className="gap-1.5">
                <XCircle size={11} />
                Недоступен
              </Badge>
            )}
          </div>
        </Card>

        {/* Announced count */}
        <Card className="py-4 gap-1.5">
          <div className="px-4 text-xs font-medium text-muted-foreground">Анонсировано префиксов</div>
          <div className="px-4 text-2xl font-semibold tabular-nums leading-none">
            {isLoading ? (
              <Skeleton className="h-7 w-16 mt-0.5" />
            ) : (
              (status?.announcedCount ?? 0).toLocaleString('ru-RU')
            )}
          </div>
        </Card>

        {/* Last sync */}
        <Card className="py-4 gap-1.5">
          <div className="px-4 text-xs font-medium text-muted-foreground">Последняя синхронизация</div>
          <div className="px-4 text-sm text-foreground">
            {isLoading ? (
              <Skeleton className="h-5 w-32 mt-0.5" />
            ) : (
              fmtTime(status?.lastSyncAt)
            )}
          </div>
        </Card>
      </div>

      {/* Error */}
      {status?.lastError && (
        <div className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          <AlertTriangle size={15} className="shrink-0 mt-0.5" />
          <div>
            <span className="font-medium">Ошибка последней синхронизации: </span>
            {status.lastError}
          </div>
        </div>
      )}

      {/* Disabled hint */}
      {!isLoading && !status?.isEnabled && (
        <div className="flex items-start gap-2 rounded-lg border border-border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
          <Radio size={15} className="shrink-0 mt-0.5" />
          <span>
            BGP отключён. Включите его в{' '}
            <a href="/settings" className="underline underline-offset-2 text-foreground">
              настройках
            </a>{' '}
            (ключ <code className="bg-muted px-1 rounded text-xs">BGP_ENABLED</code>) и укажите{' '}
            <code className="bg-muted px-1 rounded text-xs">BGP_NEXT_HOP</code>.
          </span>
        </div>
      )}
    </div>
  )
}
