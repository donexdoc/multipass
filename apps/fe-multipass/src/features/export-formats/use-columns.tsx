import type { ColumnDef } from '@tanstack/react-table'
import type { ExportFormat } from '@multipass/shared'
import { Pencil, Trash2, Copy, Check } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/shared/ui/button.js'
import { Badge } from '@/shared/ui/badge.js'

interface UseColumnsOptions {
  onEdit: (format: ExportFormat) => void
  onDelete: (format: ExportFormat) => void
}

function ExportUrl({ slug }: { slug: string }) {
  const url = `${window.location.origin}/api/export/${slug}`
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    }).catch(() => {
      // clipboard unavailable (non-https / browser restriction) — user can select manually
    })
  }

  return (
    <div className="flex items-center gap-1.5 min-w-0">
      <input
        readOnly
        value={url}
        onClick={(e) => (e.target as HTMLInputElement).select()}
        className="flex-1 min-w-0 text-xs bg-muted border border-input rounded px-2 py-1 font-mono text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring cursor-text"
      />
      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6 shrink-0"
        onClick={handleCopy}
        title="Скопировать"
      >
        {copied ? <Check size={12} className="text-green-500" /> : <Copy size={12} />}
      </Button>
    </div>
  )
}

export function useExportFormatColumns({ onEdit, onDelete }: UseColumnsOptions): ColumnDef<ExportFormat>[] {
  return [
    {
      accessorKey: 'name',
      header: 'Название',
      cell: ({ row }) => (
        <div>
          <div className="font-medium text-sm">{row.original.name}</div>
          <code className="text-xs text-muted-foreground">{row.original.slug}</code>
        </div>
      ),
    },
    {
      accessorKey: 'lineTemplate',
      header: 'Шаблон',
      cell: ({ getValue }) => (
        <code className="text-xs bg-muted px-1.5 py-0.5 rounded max-w-xs truncate block">
          {getValue<string>()}
        </code>
      ),
    },
    {
      id: 'url',
      header: 'Публичный URL',
      cell: ({ row }) => <ExportUrl slug={row.original.slug} />,
    },
    {
      accessorKey: 'contentType',
      header: 'Content-Type',
      cell: ({ getValue }) => (
        <span className="text-xs text-muted-foreground">{getValue<string>()}</span>
      ),
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
        const format = row.original
        return (
          <div className="flex items-center gap-1 justify-end">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEdit(format)}>
              <Pencil size={13} />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-destructive hover:text-destructive"
              onClick={() => onDelete(format)}
            >
              <Trash2 size={13} />
            </Button>
          </div>
        )
      },
    },
  ]
}
