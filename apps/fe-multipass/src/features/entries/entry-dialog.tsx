import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import type { CustomEntry } from '@multipass/shared'
import { validateAddressValue, ADDRESS_TYPE_LABELS } from '@multipass/shared'
import { useCreateEntry, useUpdateEntry } from '@/entities/entry/index.js'
import { Button } from '@/shared/ui/button.js'
import { Input } from '@/shared/ui/input.js'
import { Label } from '@/shared/ui/label.js'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select.js'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/shared/ui/dialog.js'

const ADDRESS_TYPES = ['IP', 'SUBNET', 'RANGE', 'DOMAIN'] as const

const schema = z
  .object({
    value: z.string().min(1, 'Обязательное поле'),
    type: z.enum(ADDRESS_TYPES),
    comment: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.value && !validateAddressValue(data.value, data.type)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['value'],
        message: `Введите корректный ${ADDRESS_TYPE_LABELS[data.type]}`,
      })
    }
  })

type FormValues = z.infer<typeof schema>

interface EntryDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  entry?: CustomEntry
}

export function EntryDialog({ open, onOpenChange, entry }: EntryDialogProps) {
  const isEdit = !!entry
  const { mutate: create, isPending: isCreating } = useCreateEntry()
  const { mutate: update, isPending: isUpdating } = useUpdateEntry()
  const isPending = isCreating || isUpdating

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { value: '', type: 'IP', comment: '' },
  })

  const typeValue = watch('type')

  useEffect(() => {
    if (open) {
      reset(
        entry
          ? { value: entry.value, type: entry.type, comment: entry.comment ?? '' }
          : { value: '', type: 'IP', comment: '' },
      )
    }
  }, [open, entry, reset])

  const onSubmit = (values: FormValues) => {
    const payload = { ...values, comment: values.comment || undefined }
    if (isEdit) {
      update(
        { id: entry.id, dto: payload },
        {
          onSuccess: () => { toast.success('Запись обновлена'); onOpenChange(false) },
          onError: () => toast.error('Ошибка при обновлении'),
        },
      )
    } else {
      create(payload, {
        onSuccess: () => { toast.success('Запись добавлена'); onOpenChange(false) },
        onError: () => toast.error('Ошибка при создании'),
      })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Редактировать запись' : 'Добавить запись'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>Тип</Label>
            <Select
              value={typeValue}
              onValueChange={(v) => {
                setValue('type', v as typeof typeValue, { shouldValidate: false })
                setValue('value', '', { shouldValidate: false })
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ADDRESS_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="value">Значение</Label>
            <Input
              id="value"
              {...register('value')}
              placeholder={
                typeValue === 'IP'
                  ? '1.2.3.4'
                  : typeValue === 'SUBNET'
                    ? '10.0.0.0/8'
                    : typeValue === 'RANGE'
                      ? '1.2.3.0-1.2.3.255'
                      : 'example.com'
              }
            />
            {errors.value && <p className="text-xs text-destructive">{errors.value.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="comment">
              Комментарий <span className="text-muted-foreground font-normal">(необязательно)</span>
            </Label>
            <Input id="comment" {...register('comment')} />
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
