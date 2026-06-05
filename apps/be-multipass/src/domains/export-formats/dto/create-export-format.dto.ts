import { IsString, IsNotEmpty, IsOptional } from 'class-validator'

export class CreateExportFormatDto {
  @IsString()
  @IsNotEmpty()
  name!: string

  @IsString()
  @IsNotEmpty()
  slug!: string

  @IsString()
  @IsNotEmpty()
  lineTemplate!: string

  @IsString()
  @IsOptional()
  header?: string

  @IsString()
  @IsOptional()
  footer?: string

  @IsString()
  @IsOptional()
  contentType?: string
}
