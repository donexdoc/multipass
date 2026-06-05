export interface User {
  id: string
  login: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface CreateUserDto {
  login: string
  password: string
}

export interface UpdateUserDto {
  login?: string
  password?: string
  isActive?: boolean
}

export interface LoginDto {
  login: string
  password: string
}

export interface AuthTokens {
  accessToken: string
  refreshToken: string
}
