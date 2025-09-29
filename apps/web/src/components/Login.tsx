import { useState } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native'
import { InputField, Button } from '@shared/components'

interface LoginProps {
  onLoginSuccess?: () => void
}

export default function Login({ onLoginSuccess }: LoginProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)

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
      onLoginSuccess?.()
    }, 1000)
  }

  const handleForgotPassword = () => {
    Alert.alert('비밀번호 찾기', '비밀번호 찾기 기능을 구현할 예정입니다.')
  }

  const handleSignUp = () => {
    Alert.alert('회원가입', '회원가입 페이지로 이동합니다.')
  }

  return (
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

        <Button
          title={isLoading ? '로그인 중...' : '로그인'}
          onPress={handleLogin}
          loading={isLoading}
          variant="primary"
        />
      </View>

      <View style={styles.signupLink}>
        <Text style={styles.signupText}>계정이 없으신가요? </Text>
        <TouchableOpacity onPress={handleSignUp}>
          <Text style={styles.signupLinkText}>회원가입</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
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
})