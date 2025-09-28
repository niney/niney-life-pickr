import { useState, useEffect } from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { getAppInfo } from './utils/config'
import type { AppConfig } from './utils/config'
import Login from './components/Login'

function App() {
  const [appInfo, setAppInfo] = useState<AppConfig['app'] | null>(null)
  const [isLoggedIn, setIsLoggedIn] = useState(false)

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

  const handleLoginSuccess = () => {
    setIsLoggedIn(true)
  }

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <View style={styles.header}>
          <Text style={styles.title}>
            🎯 {appInfo?.name || 'Life Pickr'}
          </Text>
          <Text style={styles.subtitle}>
            {appInfo?.description || '당신의 라이프스타일을 선택하세요'}
          </Text>
        </View>

        <View style={styles.main}>
          {isLoggedIn ? (
            <View style={styles.welcomeContainer}>
              <Text style={styles.welcomeText}>환영합니다! 🎉</Text>
              <Text style={styles.welcomeSubtext}>로그인에 성공했습니다.</Text>
            </View>
          ) : (
            <Login onLoginSuccess={handleLoginSuccess} />
          )}
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            {appInfo?.name || 'Life Pickr'} v{appInfo?.version || '1.0.0'}
          </Text>
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#667eea',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  card: {
    width: '100%',
    maxWidth: 600,
    backgroundColor: 'white',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 20,
    },
    shadowOpacity: 0.1,
    shadowRadius: 40,
    elevation: 20,
    overflow: 'hidden',
  },
  header: {
    alignItems: 'center',
    paddingVertical: 48,
    paddingHorizontal: 32,
    backgroundColor: '#f5f7fa',
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#2d3748',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#718096',
    textAlign: 'center',
  },
  main: {
    padding: 32,
  },
  welcomeContainer: {
    alignItems: 'center',
    padding: 48,
  },
  welcomeText: {
    fontSize: 28,
    fontWeight: '600',
    color: '#2d3748',
    marginBottom: 8,
  },
  welcomeSubtext: {
    fontSize: 16,
    color: '#718096',
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 32,
    backgroundColor: '#f7fafc',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  footerText: {
    fontSize: 14,
    color: '#718096',
  },
})

export default App