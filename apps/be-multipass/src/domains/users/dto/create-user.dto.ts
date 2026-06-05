import { IsString, IsNotEmpty, MinLength } from 'class-validator'

export class CreateUserDto {
  @IsString()
  @IsNotEmpty()
  login!: string

  @IsString()
  @MinLength(8)
  password!: string
}
