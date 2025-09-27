import { useState, useEffect } from 'react'
import './App.css'
import { getAppInfo } from './utils/config'
import type { AppConfig } from './utils/config'

function App() {
  const [appInfo, setAppInfo] = useState<AppConfig['app'] | null>(null)

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
          <div className="card">
            <h2>환영합니다!</h2>
            <p>더 나은 라이프스타일을 위한 선택을 도와드립니다.</p>
            
            <div className="actions">
              <button className="btn btn-primary">시작하기</button>
              <button className="btn btn-secondary">더 알아보기</button>
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
