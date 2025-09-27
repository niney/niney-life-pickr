import { useState, useEffect } from 'react'
import './App.css'
import { getAppInfo } from './utils/config'
import type { AppConfig } from './utils/config'

function App() {
  const [appInfo, setAppInfo] = useState<AppConfig['app'] | null>(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  // 컴포넌트 마운트 시 설정 로드
  useEffect(() => {
    const loadAppConfig = async () => {
      try {
        const appData = await getAppInfo();
        setAppInfo(appData);
      } catch (error) {
        console.error('Failed to load config:', error);
      }
    };

    loadAppConfig();
  }, [])

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!email || !password) {
      alert('이메일과 비밀번호를 모두 입력해주세요.')
      return
    }

    setIsLoading(true)
    
    // 로그인 시뮬레이션
    setTimeout(() => {
      setIsLoading(false)
      alert('로그인이 완료되었습니다!')
    }, 1000)
  }

  const handleForgotPassword = () => {
    alert('비밀번호 찾기 기능을 구현할 예정입니다.')
  }

  const handleSignUp = () => {
    alert('회원가입 페이지로 이동합니다.')
  }

  return (
    <div className="app">
      <div className="container">
        <header className="header">
          <h1 className="title">
            <span className="icon">🎯</span>
            {appInfo?.name || 'Life Pickr'}
          </h1>
          <p className="subtitle">
            {appInfo?.description || '당신의 라이프스타일을 선택하세요'}
          </p>
        </header>

        <main className="main">
          <div className="login-card">
            <h2>로그인</h2>
            <p>계정에 로그인하여 시작하세요</p>
            
            <form onSubmit={handleLogin} className="login-form">
              <div className="form-group">
                <label htmlFor="email">이메일</label>
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="이메일을 입력하세요"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="password">비밀번호</label>
                <input
                  type="password"
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="비밀번호를 입력하세요"
                  required
                />
              </div>

              <button 
                type="button" 
                className="forgot-password"
                onClick={handleForgotPassword}
              >
                비밀번호를 잊으셨나요?
              </button>

              <button 
                type="submit" 
                className="btn btn-primary login-btn"
                disabled={isLoading}
              >
                {isLoading ? '로그인 중...' : '로그인'}
              </button>
            </form>

            <div className="signup-link">
              <span>계정이 없으신가요? </span>
              <button type="button" onClick={handleSignUp} className="link-btn">
                회원가입
              </button>
            </div>
          </div>
        </main>

        <footer className="footer">
          <p>{appInfo?.name || 'Life Pickr'} v{appInfo?.version || '1.0.0'}</p>
        </footer>
      </div>
    </div>
  )
}

export default App
