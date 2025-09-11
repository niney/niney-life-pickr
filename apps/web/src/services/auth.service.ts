interface LoginRequest {
  email: string
  password: string
}

interface User {
  id: number
  email: string
  username: string
  provider: string
  last_login?: string
  is_active: boolean
}

interface ApiResponse<T> {
  result: boolean
  message: string
  data?: T
  timestamp: string
  statusCode?: number
}

interface LoginResponse {
  user: User
}

const API_BASE_URL = 'http://localhost:4000'

export const authService = {
  async login(credentials: LoginRequest): Promise<ApiResponse<LoginResponse>> {
    const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(credentials),
    })

    const data = await response.json()
    
    if (!response.ok) {
      throw new Error(data.message || 'Login failed')
    }
    
    return data
  },

  async register(userData: { email: string; username: string; password: string }): Promise<ApiResponse<{ user: User }>> {
    const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(userData),
    })

    const data = await response.json()
    
    if (!response.ok) {
      throw new Error(data.message || 'Registration failed')
    }
    
    return data
  },

  async getUsers(): Promise<ApiResponse<{ users: User[]; count: number }>> {
    const response = await fetch(`${API_BASE_URL}/api/auth/users`)
    
    const data = await response.json()
    
    if (!response.ok) {
      throw new Error(data.message || 'Failed to fetch users')
    }
    
    return data
  }
}