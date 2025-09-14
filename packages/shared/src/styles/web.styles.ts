// ============================================
// WEB-SPECIFIC STYLES (Tailwind v4)
// ============================================

// Container styles
export const container = {
  wrapper: 'min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8',
  content: 'max-w-md w-full space-y-8',
}

// Typography styles
export const typography = {
  title: 'text-center text-3xl font-extrabold text-gray-900 dark:text-white',
  subtitle: 'text-center text-sm text-gray-600 dark:text-gray-400',
  label: 'sr-only',
  labelVisible: 'block text-sm font-medium text-gray-700 dark:text-gray-300',
  link: 'font-medium text-indigo-600 hover:text-indigo-500',
  errorText: 'text-sm text-red-600',
}

// Form styles
export const form = {
  wrapper: 'mt-8 space-y-6',
  fieldGroup: 'space-y-4',
  inputGroup: 'rounded-md shadow-sm -space-y-px',
}

// Input styles
export const input = {
  base: 'appearance-none relative block w-full px-3 py-2 border placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-white bg-white dark:bg-gray-700 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm',
  default: 'border-gray-300 dark:border-gray-600',
  error: 'border-red-500',
  rounded: 'rounded-md',
  roundedTop: 'rounded-t-md rounded-none',
  roundedBottom: 'rounded-b-md rounded-none',
}

// Button styles
export const button = {
  primary: 'group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed',
  secondary: 'group relative w-full flex justify-center py-2 px-4 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500',
  danger: 'group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500',
}

// Alert styles
export const alert = {
  error: 'rounded-md bg-red-50 p-4',
  errorText: 'text-sm text-red-800',
  success: 'rounded-md bg-green-50 p-4',
  successText: 'text-sm text-green-800',
  warning: 'rounded-md bg-yellow-50 p-4',
  warningText: 'text-sm text-yellow-800',
  info: 'rounded-md bg-blue-50 p-4',
  infoText: 'text-sm text-blue-800',
}

// Helper function to get input styles for grouped inputs
export const getInputStyles = (position: 'top' | 'bottom' | 'middle', hasError = false) => {
  const baseClasses = input.base
  const borderClasses = hasError ? input.error : input.default

  let roundedClasses = ''
  if (position === 'top') {
    roundedClasses = input.roundedTop
  } else if (position === 'bottom') {
    roundedClasses = input.roundedBottom
  } else {
    roundedClasses = 'rounded-none'
  }

  return `${baseClasses} ${borderClasses} ${roundedClasses}`
}

// Helper function to get input styles for standalone inputs
export const getRegisterInputStyles = (hasError = false) => {
  const baseClasses = `mt-1 ${input.base}`
  const borderClasses = hasError ? input.error : input.default
  const roundedClasses = input.rounded

  return `${baseClasses} ${borderClasses} ${roundedClasses}`
}

// Helper function to get button styles
export const getButtonStyles = (variant: 'primary' | 'secondary' | 'danger' = 'primary') => {
  return button[variant]
}