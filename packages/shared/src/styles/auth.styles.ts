// Shared authentication styles for web and mobile
export const authStyles = {
  // Container styles
  container: {
    wrapper: 'min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8',
    content: 'max-w-md w-full space-y-8',
  },
  
  // Typography styles  
  typography: {
    title: 'text-center text-3xl font-extrabold text-gray-900 dark:text-white',
    subtitle: 'text-center text-sm text-gray-600 dark:text-gray-400',
    label: 'sr-only',
    labelVisible: 'block text-sm font-medium text-gray-700 dark:text-gray-300',
    link: 'font-medium text-indigo-600 hover:text-indigo-500',
    errorText: 'text-sm text-red-600',
  },
  
  // Form styles
  form: {
    wrapper: 'mt-8 space-y-6',
    fieldGroup: 'space-y-4',
    inputGroup: 'rounded-md shadow-sm -space-y-px',
  },
  
  // Input styles
  input: {
    base: 'appearance-none relative block w-full px-3 py-2 border placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-white bg-white dark:bg-gray-700 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm',
    default: 'border-gray-300 dark:border-gray-600',
    error: 'border-red-500',
    rounded: 'rounded-md',
    roundedTop: 'rounded-t-md rounded-none',
    roundedBottom: 'rounded-b-md rounded-none',
  },
  
  // Button styles
  button: {
    primary: 'group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed',
  },
  
  // Alert styles
  alert: {
    error: 'rounded-md bg-red-50 p-4',
    errorText: 'text-sm text-red-800',
  },
  
  // Mobile-specific styles (for React Native)
  mobile: {
    container: 'flex-1 bg-gray-50',
    contentContainer: 'flex-1 justify-center px-6',
    titleContainer: 'items-center mb-8',
    title: 'text-3xl font-bold text-gray-900 mb-2',
    subtitle: 'text-base text-gray-600 text-center',
    input: 'border border-gray-300 rounded-lg px-3.5 py-2.5 text-base text-gray-900 bg-white',
    inputError: 'border border-red-500 rounded-lg px-3.5 py-2.5 text-base text-gray-900 bg-white',
    button: 'bg-indigo-600 rounded-lg py-3 items-center mt-6',
    buttonDisabled: 'bg-indigo-400 rounded-lg py-3 items-center mt-6',
    buttonText: 'text-white text-base font-medium',
    link: 'text-indigo-600',
    linkText: 'text-sm text-gray-600 text-center mt-4',
    errorText: 'text-red-600 text-sm mt-1',
  }
}

// Helper function to get input styles for login (grouped inputs)
export const getInputStyles = (position: 'top' | 'bottom' | 'middle', hasError = false) => {
  const baseClasses = authStyles.input.base
  const borderClasses = hasError ? authStyles.input.error : authStyles.input.default
  
  let roundedClasses = ''
  if (position === 'top') {
    roundedClasses = authStyles.input.roundedTop
  } else if (position === 'bottom') {
    roundedClasses = authStyles.input.roundedBottom
  } else {
    roundedClasses = 'rounded-none'
  }
  
  return `${baseClasses} ${borderClasses} ${roundedClasses}`
}

// Helper function to get input styles for register (individual inputs)
export const getRegisterInputStyles = (hasError = false) => {
  const baseClasses = `mt-1 ${authStyles.input.base}`
  const borderClasses = hasError ? authStyles.input.error : authStyles.input.default
  const roundedClasses = authStyles.input.rounded
  
  return `${baseClasses} ${borderClasses} ${roundedClasses}`
}

// Helper function to get button styles
export const getButtonStyles = (isDisabled = false) => {
  return authStyles.button.primary
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