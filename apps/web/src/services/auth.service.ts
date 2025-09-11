import { createApiService, ApiService } from '@niney/shared'

const API_BASE_URL = 'http://localhost:4000'

// Initialize the API service
const apiService: ApiService = createApiService({
  baseURL: API_BASE_URL
})

// Export the auth service from shared package
export const authService = apiService.auth