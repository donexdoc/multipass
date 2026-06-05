import { IsString, IsOptional, IsEnum, IsBoolean } from 'class-validator'
import { AddressType } from '@multipass/prisma'
import { IsValidAddressForType } from './address-value.validator.js'

export class UpdateEntryDto {
  @IsString()
  @IsOptional()
  @IsValidAddressForType()
  value?: string

  @IsEnum(AddressType)
  @IsOptional()
  type?: AddressType

  @IsString()
  @IsOptional()
  comment?: string

  @IsBoolean()
  @IsOptional()
  isEnabled?: boolean
}
