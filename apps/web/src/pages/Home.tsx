import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { StorageService, WebStorageAdapter } from '@niney/shared'
import type { User } from '@niney/shared'

const Home = () => {
  const [count, setCount] = useState(0)
  const [user, setUser] = useState<User | null>(null)
  const navigate = useNavigate()
  const storage = new StorageService(new WebStorageAdapter())

  useEffect(() => {
    const userData = storage.getUserData()
    if (!userData) {
      navigate('/login')
    } else {
      setUser(userData)
    }
  }, [navigate])

  const handleLogout = () => {
    storage.removeUserData()
    storage.removeAuthToken()
    navigate('/login')
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100 flex items-center justify-center p-4">
      <article className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full">
        <header>
          <div className="flex justify-between items-start mb-6">
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-gray-800 text-center">
                Niney Life Pickr
              </h1>
              <p className="text-gray-600 text-center mt-2">
                인생의 선택을 도와드립니다
              </p>
            </div>
          </div>

          {user && (
            <div className="bg-gray-50 rounded-lg p-4 mb-4">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm text-gray-600">환영합니다!</p>
                  <p className="text-lg font-semibold text-gray-800">{user.username}님</p>
                </div>
                <button
                  onClick={handleLogout}
                  className="text-sm text-red-600 hover:text-red-700 font-medium"
                >
                  로그아웃
                </button>
              </div>
            </div>
          )}
        </header>

        <section className="space-y-4 mt-4">
          <div className="bg-gradient-to-r from-purple-500 to-indigo-600 rounded-lg p-6 text-white" role="region" aria-label="카운터 섹션">
            <div className="text-center">
              <p className="text-sm opacity-90 mb-2">카운터 테스트</p>
              <p className="text-4xl font-bold mb-4" aria-live="polite" aria-atomic="true">{count}</p>
              <button
                onClick={() => setCount(count + 1)}
                className="bg-white text-purple-600 px-6 py-2 rounded-lg font-semibold hover:bg-opacity-90 transition-all"
                aria-label={`현재 카운트: ${count}. 클릭하여 증가`}
              >
                증가
              </button>
            </div>
          </div>

          <nav className="grid grid-cols-2 gap-3 mt-6" aria-label="메인 네비게이션">
            <button className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-3 rounded-lg font-medium transition-all">
              음식 선택
            </button>
            <button className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-3 rounded-lg font-medium transition-all">
              장소 선택
            </button>
            <button className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-3 rounded-lg font-medium transition-all">
              활동 선택
            </button>
            <button className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-3 rounded-lg font-medium transition-all">
              설정
            </button>
          </nav>
        </section>
      </article>
    </main>
  )
}

export default Home
