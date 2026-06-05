import { IsString, IsOptional, IsBoolean, MinLength } from 'class-validator'

export class UpdateUserDto {
  @IsString()
  @IsOptional()
  login?: string

  @IsString()
  @MinLength(8)
  @IsOptional()
  password?: string

  @IsBoolean()
  @IsOptional()
  isActive?: boolean
}
