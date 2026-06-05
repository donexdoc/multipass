export interface Setting {
  key: string
  value: string
  description: string | null
  updatedAt: string
  isDefault: boolean
}

export interface UpdateSettingDto {
  value: string
}
