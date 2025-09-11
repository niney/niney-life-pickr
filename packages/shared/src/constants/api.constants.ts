export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/api/auth/login',
    REGISTER: '/api/auth/register',
    USERS: '/api/auth/users',
    LOGOUT: '/api/auth/logout',
    REFRESH: '/api/auth/refresh'
  },
  HEALTH: {
    CHECK: '/health',
    STATUS: '/health/status'
  },
  API: {
    ROOT: '/api'
  }
} as const

export const API_CONFIG = {
  DEFAULT_TIMEOUT: 30000,
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000
} as const

export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  INTERNAL_SERVER_ERROR: 500
} as const