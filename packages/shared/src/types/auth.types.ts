export type User = {
  id: number
  email: string
  username: string
  provider: string
  created_at?: string
  last_login?: string
  is_active: boolean
}

export type LoginRequest = {
  email: string
  password: string
}

export type RegisterRequest = {
  email: string
  username: string
  password: string
}

export type ApiResponse<T = any> = {
  result: boolean
  message: string
  data?: T
  timestamp: string
  statusCode?: number
}

export type LoginResponse = {
  user: User
}

export type RegisterResponse = {
  user: User
}

export type UsersResponse = {
  users: User[]
  count: number
}