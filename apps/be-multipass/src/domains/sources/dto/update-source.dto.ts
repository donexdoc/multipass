import { IsString, IsNotEmpty, IsOptional, IsEnum, IsBoolean } from 'class-validator'
import { SourceFormat } from '@multipass/prisma'

export class UpdateSourceDto {
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  name?: string

  @IsString()
  @IsNotEmpty()
  @IsOptional()
  url?: string

  @IsEnum(SourceFormat)
  @IsOptional()
  format?: SourceFormat

  @IsString()
  @IsNotEmpty()
  @IsOptional()
  updateInterval?: string

  @IsBoolean()
  @IsOptional()
  isEnabled?: boolean
}
