import { useState, useMemo, useEffect } from 'react'
import { toast } from 'sonner'
import type { RowSelectionState } from '@tanstack/react-table'
import type { ExportFormat } from '@multipass/shared'
import { useExportFormats, useDeleteExportFormat } from '@/entities/export-format/index.js'
import { useExportFormatColumns } from '@/features/export-formats/use-columns.js'
import { ExportFormatDialog } from '@/features/export-formats/export-format-dialog.js'
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
  const [editFormat, setEditFormat] = useState<ExportFormat | undefined>()
  const [confirmTarget, setConfirmTarget] = useState<ExportFormat | null>(null)
  const [confirmBulkOpen, setConfirmBulkOpen] = useState(false)

  const { data: allFormats = [], isLoading } = useExportFormats(statusFilter !== 'active')
  const { mutateAsync: deleteAsync } = useDeleteExportFormat()

  const formats = useMemo(() => {
    if (statusFilter === 'inactive') return allFormats.filter((f) => !f.isEnabled)
    return allFormats
  }, [allFormats, statusFilter])

  useEffect(() => { setRowSelection({}) }, [statusFilter])

  const selectedFormats = useMemo(
    () => formats.filter((_, i) => rowSelection[String(i)] === true),
    [formats, rowSelection],
  )

  const handleEdit = (format: ExportFormat) => {
    setEditFormat(format)
    setDialogOpen(true)
  }

  const handleDeleteConfirmed = async () => {
    if (!confirmTarget) return
    try {
      await deleteAsync(confirmTarget.id)
      toast.success('Формат деактивирован')
    } catch {
      toast.error('Ошибка при деактивации')
    } finally {
      setConfirmTarget(null)
    }
  }

  const handleBulkDeactivate = async () => {
    setIsBulkPending(true)
    try {
      await Promise.all(selectedFormats.map((f) => deleteAsync(f.id)))
      setRowSelection({})
      toast.success(`Деактивировано: ${selectedFormats.length}`)
    } catch {
      toast.error('Ошибка при массовой деактивации')
    } finally {
      setIsBulkPending(false)
      setConfirmBulkOpen(false)
    }
  }

  const columns = useExportFormatColumns({
    onEdit: handleEdit,
    onDelete: (format) => setConfirmTarget(format),
  })

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Форматы экспорта</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Шаблоны для генерации конфигов</p>
        </div>
        <Button onClick={() => { setEditFormat(undefined); setDialogOpen(true) }} size="sm">
          <Plus size={15} className="mr-1.5" />
          Добавить
        </Button>
      </div>

      <div className="flex items-center gap-3">
        <RecordStatusFilter value={statusFilter} onChange={setStatusFilter} />
        <span className="text-xs text-muted-foreground">{formats.length} форматов</span>
      </div>

      <DataTable
        columns={columns}
        data={formats}
        isLoading={isLoading}
        emptyTitle="Форматы не найдены"
        emptyDescription="Добавьте первый формат экспорта"
        enableRowSelection
        rowSelection={rowSelection}
        onRowSelectionChange={setRowSelection}
      />

      <BulkActionsBar
        selectedCount={selectedFormats.length}
        total={formats.length}
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

      <ExportFormatDialog open={dialogOpen} onOpenChange={setDialogOpen} format={editFormat} />

      <ConfirmDialog
        open={!!confirmTarget}
        onOpenChange={(open) => { if (!open) setConfirmTarget(null) }}
        title="Деактивировать формат?"
        description={`Формат "${confirmTarget?.name}" будет деактивирован.`}
        confirmLabel="Деактивировать"
        onConfirm={handleDeleteConfirmed}
      />

      <ConfirmDialog
        open={confirmBulkOpen}
        onOpenChange={setConfirmBulkOpen}
        title={`Деактивировать ${selectedFormats.length} форматов?`}
        description="Выбранные форматы будут деактивированы."
        confirmLabel="Деактивировать"
        onConfirm={handleBulkDeactivate}
        isPending={isBulkPending}
      />
    </div>
  )
}
