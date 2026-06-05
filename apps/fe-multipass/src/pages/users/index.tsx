import { useState, useMemo, useEffect } from 'react'
import { toast } from 'sonner'
import type { RowSelectionState } from '@tanstack/react-table'
import type { User } from '@multipass/shared'
import { useUsers, useDeleteUser } from '@/entities/user/index.js'
import { useUserColumns } from '@/features/users/use-columns.js'
import { UserDialog } from '@/features/users/user-dialog.js'
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
  const [editUser, setEditUser] = useState<User | undefined>()
  const [confirmTarget, setConfirmTarget] = useState<User | null>(null)
  const [confirmBulkOpen, setConfirmBulkOpen] = useState(false)

  const { data: allUsers = [], isLoading } = useUsers(statusFilter !== 'active')
  const { mutateAsync: deleteAsync } = useDeleteUser()

  const users = useMemo(() => {
    if (statusFilter === 'inactive') return allUsers.filter((u) => !u.isActive)
    return allUsers
  }, [allUsers, statusFilter])

  useEffect(() => { setRowSelection({}) }, [statusFilter])

  const selectedUsers = useMemo(
    () => users.filter((_, i) => rowSelection[String(i)] === true),
    [users, rowSelection],
  )

  const handleEdit = (user: User) => {
    setEditUser(user)
    setDialogOpen(true)
  }

  const handleDeleteConfirmed = async () => {
    if (!confirmTarget) return
    try {
      await deleteAsync(confirmTarget.id)
      toast.success('Пользователь деактивирован')
    } catch {
      toast.error('Ошибка при деактивации')
    } finally {
      setConfirmTarget(null)
    }
  }

  const handleBulkDeactivate = async () => {
    setIsBulkPending(true)
    try {
      await Promise.all(selectedUsers.map((u) => deleteAsync(u.id)))
      setRowSelection({})
      toast.success(`Деактивировано: ${selectedUsers.length}`)
    } catch {
      toast.error('Ошибка при массовой деактивации')
    } finally {
      setIsBulkPending(false)
      setConfirmBulkOpen(false)
    }
  }

  const columns = useUserColumns({
    onEdit: handleEdit,
    onDelete: (user) => setConfirmTarget(user),
  })

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Пользователи</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Управление администраторами системы</p>
        </div>
        <Button onClick={() => { setEditUser(undefined); setDialogOpen(true) }} size="sm">
          <Plus size={15} className="mr-1.5" />
          Добавить
        </Button>
      </div>

      <div className="flex items-center gap-3">
        <RecordStatusFilter value={statusFilter} onChange={setStatusFilter} />
        <span className="text-xs text-muted-foreground">{users.length} пользователей</span>
      </div>

      <DataTable
        columns={columns}
        data={users}
        isLoading={isLoading}
        emptyTitle="Пользователи не найдены"
        emptyDescription="Добавьте первого администратора"
        enableRowSelection
        rowSelection={rowSelection}
        onRowSelectionChange={setRowSelection}
      />

      <BulkActionsBar
        selectedCount={selectedUsers.length}
        total={users.length}
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

      <UserDialog open={dialogOpen} onOpenChange={setDialogOpen} user={editUser} />

      <ConfirmDialog
        open={!!confirmTarget}
        onOpenChange={(open) => { if (!open) setConfirmTarget(null) }}
        title="Деактивировать пользователя?"
        description={`Пользователь "${confirmTarget?.login}" будет деактивирован.`}
        confirmLabel="Деактивировать"
        onConfirm={handleDeleteConfirmed}
      />

      <ConfirmDialog
        open={confirmBulkOpen}
        onOpenChange={setConfirmBulkOpen}
        title={`Деактивировать ${selectedUsers.length} пользователей?`}
        description="Выбранные пользователи будут деактивированы."
        confirmLabel="Деактивировать"
        onConfirm={handleBulkDeactivate}
        isPending={isBulkPending}
      />
    </div>
  )
}
