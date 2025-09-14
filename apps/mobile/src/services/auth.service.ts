import AsyncStorage from '@react-native-async-storage/async-storage'

const API_BASE_URL = 'http://localhost:4000/api'

export interface LoginRequest {
  email: string
  password: string
}

export interface User {
  id: number
  email: string
  username: string
  provider?: string
  created_at?: string
  updated_at?: string
  last_login?: string
  is_active?: boolean
}

export interface ApiResponse<T = any> {
  result: boolean
  message: string
  data?: T
  statusCode?: number
  timestamp?: string
}

class AuthService {
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || `HTTP error! status: ${response.status}`)
      }

      return data
    } catch (error) {
      console.error('Request failed:', error)
      throw error
    }
  }

  async login(credentials: LoginRequest): Promise<ApiResponse<{ user: User; token?: string }>> {
    return this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    })
  }
}

export const authService = new AuthService()

class StorageService {
  async setUserData(user: User | undefined): Promise<void> {
    if (user) {
      await AsyncStorage.setItem('user', JSON.stringify(user))
    } else {
      await AsyncStorage.removeItem('user')
    }
  }

  async getUserData(): Promise<User | null> {
    const userData = await AsyncStorage.getItem('user')
    return userData ? JSON.parse(userData) : null
  }

  async setAuthToken(token: string | undefined): Promise<void> {
    if (token) {
      await AsyncStorage.setItem('authToken', token)
    } else {
      await AsyncStorage.removeItem('authToken')
    }
  }

  async getAuthToken(): Promise<string | null> {
    return await AsyncStorage.getItem('authToken')
  }

  async clear(): Promise<void> {
    await AsyncStorage.multiRemove(['user', 'authToken'])
  }
}

export const storage = new StorageService()