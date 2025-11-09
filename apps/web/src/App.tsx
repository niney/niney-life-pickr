import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import Login from './components/Login'
import Home from './components/Home'
import Restaurant from './components/Restaurant'
import RestaurantSearch from './components/RestaurantSearch'
import { useAuth } from '@shared/hooks'
import { ThemeProvider, SocketProvider } from '@shared/contexts'

function AppContent() {
  const { isAuthenticated, isLoading, logout, checkAuth } = useAuth()

  const handleLoginSuccess = async () => {
    // 인증 상태 재확인
    await checkAuth()
  }

  // 로딩 중
  if (isLoading) {
    return (
      <div className="page-container" style={{
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#fff'
      }}>
        <div>Loading...</div>
      </div>
    )
  }

  return (
    <BrowserRouter>
      <Routes>
        {!isAuthenticated ? (
          <>
            <Route path="/login" element={<Login onLoginSuccess={handleLoginSuccess} />} />
            <Route path="*" element={<RedirectToLogin />} />
          </>
        ) : (
          <>
            <Route path="/" element={<Home onLogout={logout} />} />
            <Route path="/restaurant/*" element={<Restaurant onLogout={logout} />} />
            <Route path="/restaurant-search/*" element={<RestaurantSearch onLogout={logout} />} />
            <Route path="/login" element={<Navigate to="/" replace />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </>
        )}
      </Routes>
    </BrowserRouter>
  )
}

// 로그인 페이지로 리다이렉트하면서 원래 URL 저장
function RedirectToLogin() {
  const location = useLocation()
  
  // 현재 경로를 sessionStorage에 저장
  useEffect(() => {
    if (location.pathname !== '/login') {
      sessionStorage.setItem('redirectUrl', location.pathname + location.search)
    }
  }, [location])

  return <Navigate to="/login" replace />
}

function App() {
  return (
    <ThemeProvider>
      <SocketProvider>
        <AppContent />
      </SocketProvider>
    </ThemeProvider>
  )
}

export default App
