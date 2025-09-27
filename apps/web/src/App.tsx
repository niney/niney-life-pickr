import { useState, useEffect } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native'
import { getAppInfo } from './utils/config'
import type { AppConfig } from './utils/config'
import { InputField } from '@shared/components'

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

  const handleLogin = () => {
    if (!email || !password) {
      Alert.alert('오류', '이메일과 비밀번호를 모두 입력해주세요.')
      return
    }

    setIsLoading(true)
    
    // 로그인 시뮬레이션
    setTimeout(() => {
      setIsLoading(false)
      Alert.alert('성공', '로그인이 완료되었습니다!')
    }, 1000)
  }

  const handleForgotPassword = () => {
    Alert.alert('비밀번호 찾기', '비밀번호 찾기 기능을 구현할 예정입니다.')
  }

  const handleSignUp = () => {
    Alert.alert('회원가입', '회원가입 페이지로 이동합니다.')
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
          <View style={styles.loginCard}>
            <Text style={styles.loginTitle}>로그인</Text>
            <Text style={styles.loginSubtitle}>계정에 로그인하여 시작하세요</Text>
            
            <View style={styles.form}>
              <InputField
                label="이메일"
                placeholder="이메일을 입력하세요"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                required
              />

              <InputField
                label="비밀번호"
                placeholder="비밀번호를 입력하세요"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
                required
              />

              <TouchableOpacity 
                style={styles.forgotPasswordButton}
                onPress={handleForgotPassword}
              >
                <Text style={styles.forgotPasswordText}>비밀번호를 잊으셨나요?</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.loginButton, isLoading && styles.loginButtonDisabled]}
                onPress={handleLogin}
                disabled={isLoading}
              >
                <Text style={styles.loginButtonText}>
                  {isLoading ? '로그인 중...' : '로그인'}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.signupLink}>
              <Text style={styles.signupText}>계정이 없으신가요? </Text>
              <TouchableOpacity onPress={handleSignUp}>
                <Text style={styles.signupLinkText}>회원가입</Text>
              </TouchableOpacity>
            </View>
          </View>
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
  loginCard: {
    alignItems: 'center',
  },
  loginTitle: {
    fontSize: 24,
    color: '#2d3748',
    marginBottom: 8,
    fontWeight: '600',
  },
  loginSubtitle: {
    fontSize: 16,
    color: '#4a5568',
    marginBottom: 32,
    textAlign: 'center',
  },
  form: {
    width: '100%',
    marginBottom: 24,
  },
  forgotPasswordButton: {
    alignSelf: 'flex-end',
    marginBottom: 24,
  },
  forgotPasswordText: {
    fontSize: 14,
    color: '#667eea',
    fontWeight: '500',
  },
  loginButton: {
    width: '100%',
    height: 52,
    backgroundColor: '#667eea',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loginButtonDisabled: {
    backgroundColor: '#a0aec0',
  },
  loginButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  signupLink: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 24,
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  signupText: {
    fontSize: 14,
    color: '#4a5568',
  },
  signupLinkText: {
    fontSize: 14,
    color: '#667eea',
    fontWeight: '500',
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
