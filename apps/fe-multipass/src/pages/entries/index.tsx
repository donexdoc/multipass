import { useState, useMemo, useEffect } from 'react'
import { toast } from 'sonner'
import type { RowSelectionState } from '@tanstack/react-table'
import type { CustomEntry } from '@multipass/shared'
import { useEntries, useDeleteEntry } from '@/entities/entry/index.js'
import { useEntryColumns } from '@/features/entries/use-columns.js'
import { EntryDialog } from '@/features/entries/entry-dialog.js'
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
  const [editEntry, setEditEntry] = useState<CustomEntry | undefined>()
  const [confirmTarget, setConfirmTarget] = useState<CustomEntry | null>(null)
  const [confirmBulkOpen, setConfirmBulkOpen] = useState(false)

  const { data: allEntries = [], isLoading } = useEntries(statusFilter !== 'active')
  const { mutateAsync: deleteAsync } = useDeleteEntry()

  const entries = useMemo(() => {
    if (statusFilter === 'inactive') return allEntries.filter((e) => !e.isEnabled)
    return allEntries
  }, [allEntries, statusFilter])

  useEffect(() => { setRowSelection({}) }, [statusFilter])

  const selectedEntries = useMemo(
    () => entries.filter((_, i) => rowSelection[String(i)] === true),
    [entries, rowSelection],
  )

  const handleEdit = (entry: CustomEntry) => {
    setEditEntry(entry)
    setDialogOpen(true)
  }

  const handleDeleteConfirmed = async () => {
    if (!confirmTarget) return
    try {
      await deleteAsync(confirmTarget.id)
      toast.success('Запись деактивирована')
    } catch {
      toast.error('Ошибка при деактивации')
    } finally {
      setConfirmTarget(null)
    }
  }

  const handleBulkDeactivate = async () => {
    setIsBulkPending(true)
    try {
      await Promise.all(selectedEntries.map((e) => deleteAsync(e.id)))
      setRowSelection({})
      toast.success(`Деактивировано: ${selectedEntries.length}`)
    } catch {
      toast.error('Ошибка при массовой деактивации')
    } finally {
      setIsBulkPending(false)
      setConfirmBulkOpen(false)
    }
  }

  const columns = useEntryColumns({
    onEdit: handleEdit,
    onDelete: (entry) => setConfirmTarget(entry),
  })

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Записи</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Кастомные IP, подсети, домены</p>
        </div>
        <Button onClick={() => { setEditEntry(undefined); setDialogOpen(true) }} size="sm">
          <Plus size={15} className="mr-1.5" />
          Добавить
        </Button>
      </div>

      <div className="flex items-center gap-3">
        <RecordStatusFilter value={statusFilter} onChange={setStatusFilter} />
        <span className="text-xs text-muted-foreground">{entries.length} записей</span>
      </div>

      <DataTable
        columns={columns}
        data={entries}
        isLoading={isLoading}
        emptyTitle="Записи не найдены"
        emptyDescription="Добавьте IP, подсеть, диапазон или домен"
        enableRowSelection
        rowSelection={rowSelection}
        onRowSelectionChange={setRowSelection}
      />

      <BulkActionsBar
        selectedCount={selectedEntries.length}
        total={entries.length}
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

      <EntryDialog open={dialogOpen} onOpenChange={setDialogOpen} entry={editEntry} />

      <ConfirmDialog
        open={!!confirmTarget}
        onOpenChange={(open) => { if (!open) setConfirmTarget(null) }}
        title="Деактивировать запись?"
        description={`Запись "${confirmTarget?.value}" будет деактивирована.`}
        confirmLabel="Деактивировать"
        onConfirm={handleDeleteConfirmed}
      />

      <ConfirmDialog
        open={confirmBulkOpen}
        onOpenChange={setConfirmBulkOpen}
        title={`Деактивировать ${selectedEntries.length} записей?`}
        description="Выбранные записи будут деактивированы."
        confirmLabel="Деактивировать"
        onConfirm={handleBulkDeactivate}
        isPending={isBulkPending}
      />
    </div>
  )
}
