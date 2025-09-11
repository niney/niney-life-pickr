import { ApiClientConfig } from './base.service'
import { AuthService } from './auth.service'

export class ApiService {
  public auth: AuthService

  constructor(config: ApiClientConfig) {
    this.auth = new AuthService(config)
  }

  setAuthToken(token: string): void {
    this.auth.setAuthToken(token)
  }

  removeAuthToken(): void {
    this.auth.removeAuthToken()
  }
}

// Singleton instance for convenience
let apiInstance: ApiService | null = null

export function createApiService(config: ApiClientConfig): ApiService {
  apiInstance = new ApiService(config)
  return apiInstance
}

export function getApiService(): ApiService {
  if (!apiInstance) {
    throw new Error('API Service not initialized. Call createApiService first.')
  }
  return apiInstance
}