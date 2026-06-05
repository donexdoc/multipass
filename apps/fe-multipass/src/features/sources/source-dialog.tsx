import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import type { Source } from '@multipass/shared'
import { useCreateSource, useUpdateSource } from '@/entities/source/index.js'
import { Button } from '@/shared/ui/button.js'
import { Input } from '@/shared/ui/input.js'
import { Label } from '@/shared/ui/label.js'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/shared/ui/dialog.js'

const schema = z.object({
  name: z.string().min(1, 'Обязательное поле'),
  url: z.string().url('Введите корректный URL'),
  updateInterval: z.string().min(1, 'Обязательное поле'),
})

type FormValues = z.infer<typeof schema>

interface SourceDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  source?: Source
}

export function SourceDialog({ open, onOpenChange, source }: SourceDialogProps) {
  const isEdit = !!source
  const { mutate: create, isPending: isCreating } = useCreateSource()
  const { mutate: update, isPending: isUpdating } = useUpdateSource()
  const isPending = isCreating || isUpdating

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', url: '', updateInterval: '0 */6 * * *' },
  })

  useEffect(() => {
    if (open) {
      reset(
        source
          ? { name: source.name, url: source.url, updateInterval: source.updateInterval }
          : { name: '', url: '', updateInterval: '0 */6 * * *' },
      )
    }
  }, [open, source, reset])

  const onSubmit = (values: FormValues) => {
    const payload = { ...values, format: 'PLAIN_TEXT' as const }
    if (isEdit) {
      update(
        { id: source.id, dto: payload },
        {
          onSuccess: () => { toast.success('Источник обновлён'); onOpenChange(false) },
          onError: () => toast.error('Ошибка при обновлении'),
        },
      )
    } else {
      create(payload, {
        onSuccess: () => { toast.success('Источник добавлен'); onOpenChange(false) },
        onError: () => toast.error('Ошибка при создании'),
      })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Редактировать источник' : 'Добавить источник'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="name">Название</Label>
            <Input id="name" {...register('name')} />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="url">URL</Label>
            <Input id="url" {...register('url')} placeholder="https://example.com/list.txt" />
            {errors.url && <p className="text-xs text-destructive">{errors.url.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="updateInterval">
              Интервал обновления{' '}
              <span className="text-muted-foreground font-normal">(cron)</span>
            </Label>
            <Input id="updateInterval" {...register('updateInterval')} placeholder="0 */6 * * *" />
            {errors.updateInterval && (
              <p className="text-xs text-destructive">{errors.updateInterval.message}</p>
            )}
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Отмена
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Сохранение...' : isEdit ? 'Сохранить' : 'Добавить'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
