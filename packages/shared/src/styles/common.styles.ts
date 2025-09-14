// ============================================
// COMMON CONSTANTS (Web & Mobile)
// ============================================

// Color constants that work on both platforms
export const colors = {
  primary: {
    600: '#4f46e5', // indigo-600
    400: '#818cf8', // indigo-400
  },
  gray: {
    50: '#f9fafb',
    300: '#d1d5db',
    400: '#9ca3af',
    500: '#6b7280',
    600: '#4b5556',
    700: '#374151',
    800: '#1f2937',
    900: '#111827',
  },
  red: {
    50: '#fef2f2',
    500: '#ef4444',
    600: '#dc2626',
    800: '#991b1b',
  },
  white: '#ffffff',
}

// Shared form field configurations
export const formFields = {
  email: {
    name: 'email',
    type: 'email',
    label: '이메일 주소',
    placeholder: '이메일 주소',
    autoComplete: 'email',
  },
  username: {
    name: 'username',
    type: 'text',
    label: '사용자 이름',
    placeholder: '사용자 이름',
    autoComplete: 'username',
  },
  password: {
    name: 'password',
    type: 'password',
    label: '비밀번호',
    placeholder: '비밀번호',
    autoComplete: 'current-password',
  },
  newPassword: {
    name: 'password',
    type: 'password',
    label: '비밀번호',
    placeholder: '비밀번호 (최소 6자)',
    autoComplete: 'new-password',
  },
  confirmPassword: {
    name: 'confirmPassword',
    type: 'password',
    label: '비밀번호 확인',
    placeholder: '비밀번호 확인',
    autoComplete: 'new-password',
  },
}

// Shared text content
export const authText = {
  login: {
    title: 'Niney Life Pickr',
    subtitle: '인생의 선택을 도와드립니다',
    noAccount: '계정이 없으신가요?',
    registerLink: '회원가입',
    submitButton: '로그인',
    loadingButton: '로그인 중...',
  },
  register: {
    title: '회원가입',
    subtitle: '새로운 계정을 만들어보세요',
    hasAccount: '이미 계정이 있으신가요?',
    loginLink: '로그인',
    submitButton: '가입하기',
    loadingButton: '가입 중...',
    successMessage: (username: string) => `환영합니다 ${username}님! 이제 로그인하실 수 있습니다.`,
  },
  error: {
    loginFailed: '로그인에 실패했습니다',
    registerFailed: '회원가입에 실패했습니다',
    generic: '오류가 발생했습니다',
  },
}

// Common spacing and sizing
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
  '4xl': 48,
}

// Common font sizes
export const fontSize = {
  xs: 12,
  sm: 14,
  base: 16,
  lg: 18,
  xl: 20,
  '2xl': 24,
  '3xl': 30,
  '4xl': 36,
}

// Common border radius
export const borderRadius = {
  none: 0,
  sm: 2,
  md: 6,
  lg: 8,
  xl: 12,
  full: 9999,
}