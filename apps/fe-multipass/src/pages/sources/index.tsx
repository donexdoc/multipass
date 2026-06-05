import { useState, useMemo, useEffect } from 'react'
import { toast } from 'sonner'
import type { RowSelectionState } from '@tanstack/react-table'
import type { Source } from '@multipass/shared'
import {
  useSources,
  useDeleteSource,
  useFetchSource,
} from '@/entities/source/index.js'
import { useSourceColumns } from '@/features/sources/use-columns.js'
import { SourceDialog } from '@/features/sources/source-dialog.js'
import { DataTable } from '@/shared/ui/data-table.js'
import { RecordStatusFilter, type RecordStatus } from '@/shared/ui/record-status-filter.js'
import { BulkActionsBar } from '@/shared/ui/bulk-actions-bar.js'
import { ConfirmDialog } from '@/shared/ui/confirm-dialog.js'
import { Button } from '@/shared/ui/button.js'
import { Plus } from 'lucide-react'

export function Component() {
  const [statusFilter, setStatusFilter] = useState<RecordStatus>('active')
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})
  const [isBulkPending, setIsBulkPending] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editSource, setEditSource] = useState<Source | undefined>()
  const [fetchingId, setFetchingId] = useState<string | null>(null)
  const [confirmTarget, setConfirmTarget] = useState<Source | null>(null)
  const [confirmBulkOpen, setConfirmBulkOpen] = useState(false)

  const { data: allSources = [], isLoading } = useSources(statusFilter !== 'active')
  const { mutateAsync: deleteAsync } = useDeleteSource()
  const { mutateAsync: fetchAsync } = useFetchSource()

  const sources = useMemo(() => {
    if (statusFilter === 'inactive') return allSources.filter((s) => !s.isEnabled)
    return allSources
  }, [allSources, statusFilter])

  useEffect(() => { setRowSelection({}) }, [statusFilter])

  const selectedSources = useMemo(
    () => sources.filter((_, i) => rowSelection[String(i)] === true),
    [sources, rowSelection],
  )

  const handleEdit = (source: Source) => {
    setEditSource(source)
    setDialogOpen(true)
  }

  const handleDeleteConfirmed = async () => {
    if (!confirmTarget) return
    try {
      await deleteAsync(confirmTarget.id)
      toast.success('Источник деактивирован')
    } catch {
      toast.error('Ошибка при деактивации')
    } finally {
      setConfirmTarget(null)
    }
  }

  const handleFetch = async (source: Source) => {
    setFetchingId(source.id)
    try {
      await fetchAsync(source.id)
      toast.success(`Обновление "${source.name}" запущено`)
    } catch {
      toast.error('Не удалось запустить обновление')
    } finally {
      setFetchingId(null)
    }
  }

  const handleBulkDeactivate = async () => {
    setIsBulkPending(true)
    try {
      await Promise.all(selectedSources.map((s) => deleteAsync(s.id)))
      setRowSelection({})
      toast.success(`Деактивировано: ${selectedSources.length}`)
    } catch {
      toast.error('Ошибка при массовой деактивации')
    } finally {
      setIsBulkPending(false)
      setConfirmBulkOpen(false)
    }
  }

  const columns = useSourceColumns({
    onEdit: handleEdit,
    onDelete: (source) => setConfirmTarget(source),
    onFetch: handleFetch,
    fetchingId,
  })

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Источники</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Внешние источники IP-адресов
          </p>
        </div>
        <Button
          onClick={() => { setEditSource(undefined); setDialogOpen(true) }}
          size="sm"
        >
          <Plus size={15} className="mr-1.5" />
          Добавить
        </Button>
      </div>

      <div className="flex items-center gap-3">
        <RecordStatusFilter value={statusFilter} onChange={setStatusFilter} />
        <span className="text-xs text-muted-foreground">
          {sources.length} {sources.length === 1 ? 'источник' : 'источников'}
        </span>
      </div>

      <DataTable
        columns={columns}
        data={sources}
        isLoading={isLoading}
        emptyTitle="Источники не найдены"
        emptyDescription="Добавьте первый источник IP-адресов"
        enableRowSelection
        rowSelection={rowSelection}
        onRowSelectionChange={setRowSelection}
      />

      <BulkActionsBar
        selectedCount={selectedSources.length}
        total={sources.length}
        onClear={() => setRowSelection({})}
        actions={[
          {
            label: 'Деактивировать',
            onClick: () => setConfirmBulkOpen(true),
            variant: 'destructive',
            isPending: isBulkPending,
          },
        ]}
      />

      <SourceDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        source={editSource}
      />

      <ConfirmDialog
        open={!!confirmTarget}
        onOpenChange={(open) => { if (!open) setConfirmTarget(null) }}
        title="Деактивировать источник?"
        description={`Источник "${confirmTarget?.name}" будет деактивирован. Данные не удаляются.`}
        confirmLabel="Деактивировать"
        onConfirm={handleDeleteConfirmed}
      />

      <ConfirmDialog
        open={confirmBulkOpen}
        onOpenChange={setConfirmBulkOpen}
        title={`Деактивировать ${selectedSources.length} источников?`}
        description="Выбранные источники будут деактивированы. Данные не удаляются."
        confirmLabel="Деактивировать"
        onConfirm={handleBulkDeactivate}
        isPending={isBulkPending}
      />
    </div>
  )
}
