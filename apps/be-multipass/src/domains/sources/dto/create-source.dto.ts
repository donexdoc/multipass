import { IsString, IsNotEmpty, IsOptional, IsEnum } from 'class-validator'
import { SourceFormat } from '@multipass/prisma'

export class CreateSourceDto {
  @IsString()
  @IsNotEmpty()
  name!: string

  @IsString()
  @IsNotEmpty()
  url!: string

  @IsEnum(SourceFormat)
  @IsOptional()
  format?: SourceFormat

  @IsString()
  @IsNotEmpty()
  updateInterval!: string
}
