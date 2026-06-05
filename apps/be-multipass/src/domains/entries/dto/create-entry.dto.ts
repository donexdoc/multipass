import { IsString, IsNotEmpty, IsOptional, IsEnum } from 'class-validator'
import { AddressType } from '@multipass/prisma'
import { IsValidAddressForType } from './address-value.validator.js'

export class CreateEntryDto {
  @IsString()
  @IsNotEmpty()
  @IsValidAddressForType()
  value!: string

  @IsEnum(AddressType)
  type!: AddressType

  @IsString()
  @IsOptional()
  comment?: string
}
