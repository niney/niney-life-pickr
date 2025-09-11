import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { authService } from '../services/auth.service'
import { 
  Validator,
  authStyles,
  getRegisterInputStyles,
  getButtonStyles,
  formFields,
  authText
} from '@niney/shared'

export default function Register() {
  const navigate = useNavigate()
  const [formData, setFormData] = useState({
    email: '',
    username: '',
    password: '',
    confirmPassword: ''
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const validateForm = () => {
    const newErrors = Validator.validateRegisterForm(
      formData.email,
      formData.username,
      formData.password,
      formData.confirmPassword
    )

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    // Clear error for this field when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!validateForm()) {
      return
    }

    setIsLoading(true)

    try {
      const response = await authService.register({
        email: formData.email,
        username: formData.username,
        password: formData.password
      })

      if (!response.result) {
        throw new Error(response.message || authText.error.registerFailed)
      }

      // Handle successful registration
      console.log('Registration successful:', response.data?.user)
      alert(authText.register.successMessage(response.data?.user.username || ''))
      // Redirect to login page
      navigate('/login')
      
    } catch (err) {
      setError(err instanceof Error ? err.message : authText.error.generic)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className={authStyles.container.wrapper}>
      <div className={authStyles.container.content}>
        <div>
          <h2 className={`mt-6 ${authStyles.typography.title}`}>
            {authText.register.title}
          </h2>
          <p className={`mt-2 ${authStyles.typography.subtitle}`}>
            {authText.register.subtitle}
          </p>
          <p className={`mt-2 ${authStyles.typography.subtitle}`}>
            {authText.register.hasAccount}{' '}
            <Link to="/login" className={authStyles.typography.link}>
              {authText.register.loginLink}
            </Link>
          </p>
        </div>
        <form className={authStyles.form.wrapper} onSubmit={handleSubmit}>
          <div className={authStyles.form.fieldGroup}>
            <div>
              <label htmlFor="email" className={authStyles.typography.labelVisible}>
                {formFields.email.label}
              </label>
              <input
                id="email"
                name="email"
                type={formFields.email.type}
                autoComplete={formFields.email.autoComplete}
                required
                className={`mt-1 ${getRegisterInputStyles(!!errors.email)}`}
                placeholder={formFields.email.placeholder}
                value={formData.email}
                onChange={handleChange}
              />
              {errors.email && (
                <p className={`mt-1 ${authStyles.typography.errorText}`}>{errors.email}</p>
              )}
            </div>

            <div>
              <label htmlFor="username" className={authStyles.typography.labelVisible}>
                {formFields.username.label}
              </label>
              <input
                id="username"
                name="username"
                type={formFields.username.type}
                autoComplete={formFields.username.autoComplete}
                required
                className={`mt-1 ${getRegisterInputStyles(!!errors.username)}`}
                placeholder={formFields.username.placeholder}
                value={formData.username}
                onChange={handleChange}
              />
              {errors.username && (
                <p className={`mt-1 ${authStyles.typography.errorText}`}>{errors.username}</p>
              )}
            </div>

            <div>
              <label htmlFor="password" className={authStyles.typography.labelVisible}>
                {formFields.newPassword.label}
              </label>
              <input
                id="password"
                name="password"
                type={formFields.newPassword.type}
                autoComplete={formFields.newPassword.autoComplete}
                required
                className={`mt-1 ${getRegisterInputStyles(!!errors.password)}`}
                placeholder={formFields.newPassword.placeholder}
                value={formData.password}
                onChange={handleChange}
              />
              {errors.password && (
                <p className={`mt-1 ${authStyles.typography.errorText}`}>{errors.password}</p>
              )}
            </div>

            <div>
              <label htmlFor="confirmPassword" className={authStyles.typography.labelVisible}>
                {formFields.confirmPassword.label}
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type={formFields.confirmPassword.type}
                autoComplete={formFields.confirmPassword.autoComplete}
                required
                className={`mt-1 ${getRegisterInputStyles(!!errors.confirmPassword)}`}
                placeholder={formFields.confirmPassword.placeholder}
                value={formData.confirmPassword}
                onChange={handleChange}
              />
              {errors.confirmPassword && (
                <p className={`mt-1 ${authStyles.typography.errorText}`}>{errors.confirmPassword}</p>
              )}
            </div>
          </div>

          {error && (
            <div className={authStyles.alert.error}>
              <div className={authStyles.alert.errorText}>{error}</div>
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={isLoading}
              className={getButtonStyles()}
            >
              {isLoading ? authText.register.loadingButton : authText.register.submitButton}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}