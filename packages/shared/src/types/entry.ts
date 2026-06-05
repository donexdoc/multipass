import type { AddressType } from '../enums.js'

export interface CustomEntry {
  id: string
  value: string
  type: AddressType
  comment: string | null
  isEnabled: boolean
  createdAt: string
  updatedAt: string
}

export interface CreateCustomEntryDto {
  value: string
  type: AddressType
  comment?: string
}

export interface UpdateCustomEntryDto {
  value?: string
  type?: AddressType
  comment?: string
  isEnabled?: boolean
}
