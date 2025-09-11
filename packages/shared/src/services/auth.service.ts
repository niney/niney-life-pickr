import { BaseApiService, ApiClientConfig } from './base.service'
import {
  LoginRequest,
  RegisterRequest,
  LoginResponse,
  RegisterResponse,
  UsersResponse,
  ApiResponse
} from '../types'
import { API_ENDPOINTS } from '../constants'

export class AuthService extends BaseApiService {
  constructor(config: ApiClientConfig) {
    super(config)
  }

  async login(credentials: LoginRequest): Promise<ApiResponse<LoginResponse>> {
    return this.post<LoginResponse>(API_ENDPOINTS.AUTH.LOGIN, credentials)
  }

  async register(userData: RegisterRequest): Promise<ApiResponse<RegisterResponse>> {
    return this.post<RegisterResponse>(API_ENDPOINTS.AUTH.REGISTER, userData)
  }

  async getUsers(): Promise<ApiResponse<UsersResponse>> {
    return this.get<UsersResponse>(API_ENDPOINTS.AUTH.USERS)
  }

  async logout(): Promise<ApiResponse<void>> {
    return this.post<void>(API_ENDPOINTS.AUTH.LOGOUT)
  }

  async refreshToken(): Promise<ApiResponse<{ token: string }>> {
    return this.post<{ token: string }>(API_ENDPOINTS.AUTH.REFRESH)
  }
}