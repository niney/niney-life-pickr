export const ValidationRules = {
  email: {
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    message: 'Please enter a valid email address'
  },
  username: {
    minLength: 3,
    maxLength: 50,
    pattern: /^[a-zA-Z0-9_-]+$/,
    messages: {
      minLength: 'Username must be at least 3 characters',
      maxLength: 'Username must be less than 50 characters',
      pattern: 'Username can only contain letters, numbers, underscores, and hyphens'
    }
  },
  password: {
    minLength: 6,
    maxLength: 100,
    messages: {
      minLength: 'Password must be at least 6 characters',
      maxLength: 'Password must be less than 100 characters',
      mismatch: 'Passwords do not match'
    }
  }
}

export class Validator {
  static isValidEmail(email: string): boolean {
    return ValidationRules.email.pattern.test(email)
  }

  static isValidUsername(username: string): boolean {
    return (
      username.length >= ValidationRules.username.minLength &&
      username.length <= ValidationRules.username.maxLength &&
      ValidationRules.username.pattern.test(username)
    )
  }

  static isValidPassword(password: string): boolean {
    return (
      password.length >= ValidationRules.password.minLength &&
      password.length <= ValidationRules.password.maxLength
    )
  }

  static validateEmail(email: string): string | null {
    if (!email) return 'Email is required'
    if (!this.isValidEmail(email)) return ValidationRules.email.message
    return null
  }

  static validateUsername(username: string): string | null {
    if (!username) return 'Username is required'
    if (username.length < ValidationRules.username.minLength) {
      return ValidationRules.username.messages.minLength
    }
    if (username.length > ValidationRules.username.maxLength) {
      return ValidationRules.username.messages.maxLength
    }
    if (!ValidationRules.username.pattern.test(username)) {
      return ValidationRules.username.messages.pattern
    }
    return null
  }

  static validatePassword(password: string): string | null {
    if (!password) return 'Password is required'
    if (password.length < ValidationRules.password.minLength) {
      return ValidationRules.password.messages.minLength
    }
    if (password.length > ValidationRules.password.maxLength) {
      return ValidationRules.password.messages.maxLength
    }
    return null
  }

  static validatePasswordMatch(password: string, confirmPassword: string): string | null {
    if (password !== confirmPassword) {
      return ValidationRules.password.messages.mismatch
    }
    return null
  }

  static validateLoginForm(email: string, password: string): Record<string, string> {
    const errors: Record<string, string> = {}
    
    const emailError = this.validateEmail(email)
    if (emailError) errors.email = emailError
    
    const passwordError = this.validatePassword(password)
    if (passwordError) errors.password = passwordError
    
    return errors
  }

  static validateRegisterForm(
    email: string,
    username: string,
    password: string,
    confirmPassword: string
  ): Record<string, string> {
    const errors: Record<string, string> = {}
    
    const emailError = this.validateEmail(email)
    if (emailError) errors.email = emailError
    
    const usernameError = this.validateUsername(username)
    if (usernameError) errors.username = usernameError
    
    const passwordError = this.validatePassword(password)
    if (passwordError) errors.password = passwordError
    
    const passwordMatchError = this.validatePasswordMatch(password, confirmPassword)
    if (passwordMatchError) errors.confirmPassword = passwordMatchError
    
    return errors
  }
}