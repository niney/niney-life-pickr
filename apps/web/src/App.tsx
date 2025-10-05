import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Login from './components/Login'
import Home from './components/Home'
import Restaurant from './components/Restaurant'
import { useAuth } from '@shared/hooks'
import { ThemeProvider } from '@shared/contexts'

function AppContent() {
  const { isAuthenticated, isLoading, logout } = useAuth()

  const handleLoginSuccess = async () => {
    // useLogin hook에서 이미 storage에 저장되므로
    // 여기서는 페이지를 리로드하여 useAuth가 자동으로 체크하도록 함
    window.location.href = '/'
  }

  // 로딩 중
  if (isLoading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
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
            <Route path="*" element={<Navigate to="/login" replace />} />
          </>
        ) : (
          <>
            <Route path="/" element={<Home onLogout={logout} />} />
            <Route path="/restaurant" element={<Restaurant onLogout={logout} />} />
            <Route path="/login" element={<Navigate to="/" replace />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </>
        )}
      </Routes>
    </BrowserRouter>
  )
}

function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  )
}

export default App
