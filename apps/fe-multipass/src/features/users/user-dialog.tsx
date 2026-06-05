import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import type { User } from '@multipass/shared'
import { useCreateUser, useUpdateUser } from '@/entities/user/index.js'
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

const createSchema = z.object({
  login: z.string().min(1, 'Обязательное поле'),
  password: z.string().min(8, 'Минимум 8 символов'),
})

const editSchema = z.object({
  login: z.string().min(1, 'Обязательное поле'),
  password: z.string().min(8, 'Минимум 8 символов').or(z.literal('')),
})

type CreateForm = z.infer<typeof createSchema>
type EditForm = z.infer<typeof editSchema>

interface UserDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  user?: User
}

export function UserDialog({ open, onOpenChange, user }: UserDialogProps) {
  const isEdit = !!user
  const { mutate: create, isPending: isCreating } = useCreateUser()
  const { mutate: update, isPending: isUpdating } = useUpdateUser()
  const isPending = isCreating || isUpdating

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<EditForm>({
    resolver: zodResolver(isEdit ? editSchema : createSchema),
    defaultValues: { login: '', password: '' },
  })

  useEffect(() => {
    if (open) {
      reset({ login: user?.login ?? '', password: '' })
    }
  }, [open, user, reset])

  const onSubmit = (values: EditForm) => {
    if (isEdit) {
      const dto: { login?: string; password?: string } = { login: values.login }
      if (values.password) dto.password = values.password
      update(
        { id: user.id, dto },
        {
          onSuccess: () => { toast.success('Пользователь обновлён'); onOpenChange(false) },
          onError: () => toast.error('Ошибка при обновлении'),
        },
      )
    } else {
      create(values as CreateForm, {
        onSuccess: () => { toast.success('Пользователь добавлен'); onOpenChange(false) },
        onError: () => toast.error('Ошибка: логин уже занят'),
      })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Редактировать пользователя' : 'Добавить пользователя'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="login">Логин</Label>
            <Input id="login" {...register('login')} />
            {errors.login && <p className="text-xs text-destructive">{errors.login.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password">
              Пароль
              {isEdit && (
                <span className="text-muted-foreground font-normal ml-1">(оставьте пустым, чтобы не менять)</span>
              )}
            </Label>
            <Input id="password" type="password" {...register('password')} />
            {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
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
