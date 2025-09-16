import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { authService } from '../services/auth.service'
import {
  StorageService,
  WebStorageAdapter,
  formFields,
  authText
} from '@niney/shared'
import { Button, Input, Alert } from '@niney/shared/src/components'

export default function Login() {
  const navigate = useNavigate()
  const storage = new StorageService(new WebStorageAdapter())
  const [email, setEmail] = useState('niney@ks.com')
  const [password, setPassword] = useState('tester')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async () => {
    setError('')
    setIsLoading(true)

    try {
      const response = await authService.login({ email, password })

      if (!response.result) {
        throw new Error(response.message || authText.error.loginFailed)
      }

      // Handle successful login
      console.log('Login successful:', response.data?.user)
      storage.setUserData(response.data?.user)
      // TODO: Set auth token when JWT is implemented
      // storage.setAuthToken(response.data?.token)
      // Redirect to home
      navigate('/')
      
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
            {authText.login.title}
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
            {authText.login.subtitle}
          </p>
          <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
            {authText.login.noAccount}{' '}
            <Link to="/register" className="font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400">
              {authText.login.registerLink}
            </Link>
          </p>
        </div>

        {/* Form Section */}
        <div className="mt-8 space-y-6">
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="email" className="sr-only">
                {formFields.email.label}
              </label>
              <Input
                type="email"
                position="top"
                placeholder={formFields.email.placeholder}
                value={email}
                onChangeText={setEmail}
              />
            </div>
            <div>
              <label htmlFor="password" className="sr-only">
                {formFields.password.label}
              </label>
              <Input
                type="password"
                position="bottom"
                placeholder={formFields.password.placeholder}
                value={password}
                onChangeText={setPassword}
              />
            </div>
          </div>

          {error && (
            <Alert variant="error">
              {error}
            </Alert>
          )}

          <div>
            <Button
              disabled={isLoading}
              loading={isLoading}
              variant="primary"
              onPress={handleSubmit}
            >
              {isLoading ? authText.login.loadingButton : authText.login.submitButton}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}