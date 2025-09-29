import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useState } from 'react'
import Login from './components/Login'
import Home from './components/Home'

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  const handleLoginSuccess = () => {
    setIsAuthenticated(true)
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
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Navigate to="/" replace />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </>
        )}
      </Routes>
    </BrowserRouter>
  )
}

export default App