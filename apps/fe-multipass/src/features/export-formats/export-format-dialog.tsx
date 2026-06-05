import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import type { ExportFormat } from '@multipass/shared'
import { useCreateExportFormat, useUpdateExportFormat } from '@/entities/export-format/index.js'
import { Button } from '@/shared/ui/button.js'
import { Input } from '@/shared/ui/input.js'
import { Textarea } from '@/shared/ui/textarea.js'
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
  slug: z.string().min(1, 'Обязательное поле').regex(/^[a-z0-9-]+$/, 'Только a-z, 0-9, дефис'),
  lineTemplate: z.string().min(1, 'Обязательное поле'),
  header: z.string().optional(),
  footer: z.string().optional(),
  contentType: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

interface ExportFormatDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  format?: ExportFormat
}

export function ExportFormatDialog({ open, onOpenChange, format }: ExportFormatDialogProps) {
  const isEdit = !!format
  const { mutate: create, isPending: isCreating } = useCreateExportFormat()
  const { mutate: update, isPending: isUpdating } = useUpdateExportFormat()
  const isPending = isCreating || isUpdating

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', slug: '', lineTemplate: '{address}', header: '', footer: '', contentType: 'text/plain' },
  })

  useEffect(() => {
    if (open) {
      reset(
        format
          ? {
              name: format.name,
              slug: format.slug,
              lineTemplate: format.lineTemplate,
              header: format.header ?? '',
              footer: format.footer ?? '',
              contentType: format.contentType,
            }
          : { name: '', slug: '', lineTemplate: '{address}', header: '', footer: '', contentType: 'text/plain' },
      )
    }
  }, [open, format, reset])

  const onSubmit = (values: FormValues) => {
    const payload = {
      ...values,
      header: values.header || undefined,
      footer: values.footer || undefined,
    }
    if (isEdit) {
      update(
        { id: format.id, dto: payload },
        {
          onSuccess: () => { toast.success('Формат обновлён'); onOpenChange(false) },
          onError: () => toast.error('Ошибка при обновлении'),
        },
      )
    } else {
      create(payload, {
        onSuccess: () => { toast.success('Формат добавлен'); onOpenChange(false) },
        onError: () => toast.error('Ошибка при создании'),
      })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Редактировать формат' : 'Добавить формат'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="name">Название</Label>
              <Input id="name" {...register('name')} />
              {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="slug">Slug</Label>
              <Input id="slug" {...register('slug')} placeholder="mikrotik" />
              {errors.slug && <p className="text-xs text-destructive">{errors.slug.message}</p>}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="lineTemplate">
              Шаблон строки{' '}
              <span className="text-muted-foreground font-normal text-xs">({'{address}'})</span>
            </Label>
            <Input id="lineTemplate" {...register('lineTemplate')} placeholder="/ip route add dst-address={address}" />
            {errors.lineTemplate && <p className="text-xs text-destructive">{errors.lineTemplate.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="header">
              Заголовок <span className="text-muted-foreground font-normal">(необязательно)</span>
            </Label>
            <Textarea id="header" rows={3} {...register('header')} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="footer">
              Подвал <span className="text-muted-foreground font-normal">(необязательно)</span>
            </Label>
            <Textarea id="footer" rows={3} {...register('footer')} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="contentType">Content-Type</Label>
            <Input id="contentType" {...register('contentType')} placeholder="text/plain" />
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
