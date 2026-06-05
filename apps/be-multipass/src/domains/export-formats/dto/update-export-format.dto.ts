import { IsString, IsOptional, IsBoolean } from 'class-validator'

export class UpdateExportFormatDto {
  @IsString()
  @IsOptional()
  name?: string

  @IsString()
  @IsOptional()
  slug?: string

  @IsString()
  @IsOptional()
  lineTemplate?: string

  @IsString()
  @IsOptional()
  header?: string

  @IsString()
  @IsOptional()
  footer?: string

  @IsString()
  @IsOptional()
  contentType?: string

  @IsBoolean()
  @IsOptional()
  isEnabled?: boolean
}
