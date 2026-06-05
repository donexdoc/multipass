import { useState } from 'react'
import { toast } from 'sonner'
import { Copy, Download, RefreshCw } from 'lucide-react'
import { useExportFormats } from '@/entities/export-format/index.js'
import { apiClient } from '@/shared/api/client.js'
import { Button } from '@/shared/ui/button.js'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select.js'
import { Skeleton } from '@/shared/ui/skeleton.js'

export function Component() {
  const { data: formats = [], isLoading: formatsLoading } = useExportFormats(false)
  const [selectedSlug, setSelectedSlug] = useState<string>('')
  const [preview, setPreview] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const handleLoad = async () => {
    if (!selectedSlug) return
    setIsLoading(true)
    try {
      const res = await apiClient.get<string>(`/export/${selectedSlug}`, {
        responseType: 'text',
      })
      setPreview(res.data)
    } catch {
      toast.error('Не удалось загрузить экспорт')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCopy = async () => {
    if (!preview) return
    await navigator.clipboard.writeText(preview)
    toast.success('Скопировано в буфер обмена')
  }

  const handleDownload = () => {
    if (!preview || !selectedSlug) return
    const format = formats.find((f) => f.slug === selectedSlug)
    const contentType = format?.contentType ?? 'text/plain'
    const blob = new Blob([preview], { type: contentType })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${selectedSlug}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  const lineCount = preview ? preview.split('\n').length : 0

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Превью экспорта</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Просмотр и скачивание сгенерированного конфига
        </p>
      </div>

      <div className="flex items-center gap-3">
        {formatsLoading ? (
          <Skeleton className="h-9 w-48" />
        ) : (
          <Select value={selectedSlug} onValueChange={setSelectedSlug}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Выберите формат" />
            </SelectTrigger>
            <SelectContent>
              {formats.map((f) => (
                <SelectItem key={f.id} value={f.slug}>
                  {f.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        <Button onClick={handleLoad} disabled={!selectedSlug || isLoading} size="sm">
          <RefreshCw size={14} className={isLoading ? 'mr-1.5 animate-spin' : 'mr-1.5'} />
          Загрузить
        </Button>

        {preview && (
          <>
            <Button variant="outline" size="sm" onClick={handleCopy}>
              <Copy size={14} className="mr-1.5" />
              Копировать
            </Button>
            <Button variant="outline" size="sm" onClick={handleDownload}>
              <Download size={14} className="mr-1.5" />
              Скачать
            </Button>
            <span className="text-xs text-muted-foreground ml-1">
              {lineCount.toLocaleString('ru-RU')} строк
            </span>
          </>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-4 w-full" />
          ))}
        </div>
      ) : preview !== null ? (
        <div className="rounded-md border border-border bg-muted/30 overflow-hidden">
          <pre className="overflow-auto max-h-[calc(100vh-280px)] p-4 text-xs font-mono leading-5 text-foreground">
            {preview}
          </pre>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-20 text-center">
          <p className="text-sm text-muted-foreground">
            Выберите формат и нажмите «Загрузить»
          </p>
        </div>
      )}
    </div>
  )
}
