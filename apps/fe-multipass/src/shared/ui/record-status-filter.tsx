import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './select.js'

export type RecordStatus = 'active' | 'inactive' | 'all'

interface RecordStatusFilterProps {
  value: RecordStatus
  onChange: (value: RecordStatus) => void
}

export function RecordStatusFilter({ value, onChange }: RecordStatusFilterProps) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v as RecordStatus)}>
      <SelectTrigger className="w-36">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="active">Активные</SelectItem>
        <SelectItem value="inactive">Неактивные</SelectItem>
        <SelectItem value="all">Все</SelectItem>
      </SelectContent>
    </Select>
  )
}
