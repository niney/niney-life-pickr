import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { authService } from '../services/auth.service'
import {
  Validator,
  formFields,
  authText
} from '@niney/shared'
import { Button, Input, Alert } from '@niney/shared/src/components'

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

  const handleChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }))
    // Clear error for this field when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }))
    }
  }

  const handleSubmit = async () => {
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
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Header Section */}
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900 dark:text-white">
            {authText.register.title}
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
            {authText.register.subtitle}
          </p>
          <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
            {authText.register.hasAccount}{' '}
            <Link to="/login" className="font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400">
              {authText.register.loginLink}
            </Link>
          </p>
        </div>

        {/* Form Section */}
        <div className="mt-8 space-y-6">
          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                {formFields.email.label}
              </label>
              <div className="mt-1">
                <Input
                  type="email"
                  placeholder={formFields.email.placeholder}
                  value={formData.email}
                  onChangeText={(value) => handleChange('email', value)}
                  hasError={!!errors.email}
                  position="single"
                />
              </div>
              {errors.email && (
                <p className="mt-2 text-sm text-red-600">{errors.email}</p>
              )}
            </div>

            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                {formFields.username.label}
              </label>
              <div className="mt-1">
                <Input
                  type="text"
                  placeholder={formFields.username.placeholder}
                  value={formData.username}
                  onChangeText={(value) => handleChange('username', value)}
                  hasError={!!errors.username}
                  position="single"
                />
              </div>
              {errors.username && (
                <p className="mt-2 text-sm text-red-600">{errors.username}</p>
              )}
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                {formFields.newPassword.label}
              </label>
              <div className="mt-1">
                <Input
                  type="password"
                  placeholder={formFields.newPassword.placeholder}
                  value={formData.password}
                  onChangeText={(value) => handleChange('password', value)}
                  hasError={!!errors.password}
                  position="single"
                />
              </div>
              {errors.password && (
                <p className="mt-2 text-sm text-red-600">{errors.password}</p>
              )}
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                {formFields.confirmPassword.label}
              </label>
              <div className="mt-1">
                <Input
                  type="password"
                  placeholder={formFields.confirmPassword.placeholder}
                  value={formData.confirmPassword}
                  onChangeText={(value) => handleChange('confirmPassword', value)}
                  hasError={!!errors.confirmPassword}
                  position="single"
                />
              </div>
              {errors.confirmPassword && (
                <p className="mt-2 text-sm text-red-600">{errors.confirmPassword}</p>
              )}
            </div>
          </div>

          {error && (
            <Alert variant="error">
              {error}
            </Alert>
          )}

          <div className="mt-6">
            <Button
              disabled={isLoading}
              loading={isLoading}
              variant="primary"
              onPress={handleSubmit}
            >
              {isLoading ? authText.register.loadingButton : authText.register.submitButton}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}