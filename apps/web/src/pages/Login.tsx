import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { authService } from '../services/auth.service'
import { 
  StorageService, 
  WebStorageAdapter,
  authStyles,
  getInputStyles,
  getButtonStyles,
  formFields,
  authText
} from '@niney/shared'

export default function Login() {
  const navigate = useNavigate()
  const storage = new StorageService(new WebStorageAdapter())
  const [email, setEmail] = useState('niney@ks.com')
  const [password, setPassword] = useState('tester')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
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
    <div className={authStyles.container.wrapper}>
      <div className={authStyles.container.content}>
        <div>
          <h2 className={`mt-6 ${authStyles.typography.title}`}>
            {authText.login.title}
          </h2>
          <p className={`mt-2 ${authStyles.typography.subtitle}`}>
            {authText.login.subtitle}
          </p>
          <p className={`mt-2 ${authStyles.typography.subtitle}`}>
            {authText.login.noAccount}{' '}
            <Link to="/register" className={authStyles.typography.link}>
              {authText.login.registerLink}
            </Link>
          </p>
        </div>
        <form className={authStyles.form.wrapper} onSubmit={handleSubmit}>
          <input type="hidden" name="remember" value="true" />
          <div className={authStyles.form.inputGroup}>
            <div>
              <label htmlFor="email-address" className={authStyles.typography.label}>
                {formFields.email.label}
              </label>
              <input
                id="email-address"
                name={formFields.email.name}
                type={formFields.email.type}
                autoComplete={formFields.email.autoComplete}
                required
                className={getInputStyles('top')}
                placeholder={formFields.email.placeholder}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="password" className={authStyles.typography.label}>
                {formFields.password.label}
              </label>
              <input
                id="password"
                name={formFields.password.name}
                type={formFields.password.type}
                autoComplete={formFields.password.autoComplete}
                required
                className={getInputStyles('bottom')}
                placeholder={formFields.password.placeholder}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
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
              {isLoading ? authText.login.loadingButton : authText.login.submitButton}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}