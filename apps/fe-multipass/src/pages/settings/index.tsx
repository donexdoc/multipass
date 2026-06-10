import { useState } from 'react'
import { toast } from 'sonner'
import type { Setting } from '@multipass/shared'
import { useSettings, useUpdateSetting } from '@/entities/setting/index.js'
import { Badge } from '@/shared/ui/badge.js'
import { Button } from '@/shared/ui/button.js'
import { Input } from '@/shared/ui/input.js'
import { Skeleton } from '@/shared/ui/skeleton.js'
import { Switch } from '@/shared/ui/switch.js'
import { Pencil, Check, X } from 'lucide-react'

function isBoolValue(v: string) {
  return v === 'true' || v === 'false'
}

function SettingRow({ setting }: { setting: Setting }) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(setting.value)
  const { mutate: update, isPending } = useUpdateSetting()

  // Sync local state when server value changes (e.g. after invalidation)
  if (!editing && value !== setting.value) setValue(setting.value)

  const handleSave = () => {
    update(
      { key: setting.key, value },
      {
        onSuccess: () => { toast.success('Настройка сохранена'); setEditing(false) },
        onError: () => toast.error('Ошибка при сохранении'),
      },
    )
  }

  const handleCancel = () => {
    setValue(setting.value)
    setEditing(false)
  }

  const header = (
    <div className="flex items-center gap-2 mb-1">
      <code className="text-sm font-mono font-medium">{setting.key}</code>
      {setting.isDefault && (
        <Badge variant="secondary" className="text-xs">По умолчанию</Badge>
      )}
    </div>
  )

  // Boolean setting: render a toggle, no manual edit mode
  if (isBoolValue(setting.value)) {
    return (
      <div className="flex items-center gap-4 py-4 border-b border-border last:border-0">
        <div className="flex-1 min-w-0">
          {header}
          {setting.description && (
            <p className="text-xs text-muted-foreground">{setting.description}</p>
          )}
        </div>
        <Switch
          checked={setting.value === 'true'}
          disabled={isPending}
          onCheckedChange={(checked) => {
            update(
              { key: setting.key, value: checked ? 'true' : 'false' },
              {
                onSuccess: () => toast.success('Настройка сохранена'),
                onError: () => toast.error('Ошибка при сохранении'),
              },
            )
          }}
        />
      </div>
    )
  }

  // Text setting
  return (
    <div className="flex items-start gap-4 py-4 border-b border-border last:border-0">
      <div className="flex-1 min-w-0">
        {header}
        {setting.description && (
          <p className="text-xs text-muted-foreground mb-2">{setting.description}</p>
        )}

        {editing ? (
          <div className="flex items-center gap-2">
            <Input
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className="h-8 text-sm font-mono max-w-xs"
              placeholder="Не задано"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSave()
                if (e.key === 'Escape') handleCancel()
              }}
            />
            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={handleSave} disabled={isPending}>
              <Check size={14} />
            </Button>
            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={handleCancel}>
              <X size={14} />
            </Button>
          </div>
        ) : setting.value === '' ? (
          <span className="text-sm text-muted-foreground italic">Не задано</span>
        ) : (
          <code className="text-sm bg-muted px-2 py-0.5 rounded">{setting.value}</code>
        )}
      </div>

      {!editing && (
        <Button variant="ghost" size="icon" className="h-8 w-8 mt-0.5 shrink-0" onClick={() => setEditing(true)}>
          <Pencil size={13} />
        </Button>
      )}
    </div>
  )
}

export function Component() {
  const { data: settings = [], isLoading } = useSettings()

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Настройки</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Системные параметры приложения</p>
      </div>

      <div className="rounded-md border border-border bg-card px-4">
        {isLoading ? (
          <div className="space-y-4 py-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : settings.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">Настройки не найдены</p>
        ) : (
          settings.map((setting) => <SettingRow key={setting.key} setting={setting} />)
        )}
      </div>
    </div>
  )
}
