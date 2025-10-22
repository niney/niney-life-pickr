import React, { useEffect, useRef } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native'
import { useNavigate } from 'react-router-dom'
import { InputField, Button } from '@shared/components'
import { useLogin } from '@shared/hooks'
import { useTheme } from '@shared/contexts'
import { APP_INFO_CONSTANTS, AUTH_CONSTANTS, THEME_COLORS } from '@shared/constants'

interface LoginProps {
  onLoginSuccess?: () => void
}

const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
  const navigate = useNavigate()
  const {
    email,
    setEmail,
    password,
    setPassword,
    isLoading,
    handleLogin: handleLoginBase,
    handleForgotPassword,
    handleSignUp,
  } = useLogin()

  const { theme } = useTheme()
  const colors = THEME_COLORS[theme]
  const autoLoginAttempted = useRef(false)

  const handleLogin = async () => {
    handleLoginBase(async () => {
      // 로그인 성공 시 원래 가려던 URL로 이동
      const redirectUrl = sessionStorage.getItem('redirectUrl')
      
      if (redirectUrl) {
        sessionStorage.removeItem('redirectUrl')
        // onLoginSuccess를 먼저 호출하여 인증 상태 업데이트
        if (onLoginSuccess) {
          await onLoginSuccess()
        }
        // 약간의 딜레이 후 리다이렉트 (인증 상태 업데이트 보장)
        setTimeout(() => {
          navigate(redirectUrl, { replace: true })
        }, 100)
      } else {
        if (onLoginSuccess) {
          await onLoginSuccess()
        }
        navigate('/', { replace: true })
      }
    })
  }

  // 자동 로그인 - 페이지 로드 시 한 번만 실행
  useEffect(() => {
    if (!autoLoginAttempted.current && email && password) {
      autoLoginAttempted.current = true
      // 약간의 딜레이 후 자동 로그인 (UI가 렌더링된 후)
      const timer = setTimeout(() => {
        handleLogin()
      }, 500)
      
      return () => clearTimeout(timer)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="page-container" style={{ backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }}>
      <View style={styles.container}>
        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          showsVerticalScrollIndicator={false}
        >
          {/* 헤더 */}
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.text }]}>{APP_INFO_CONSTANTS.title}</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{APP_INFO_CONSTANTS.subtitle}</Text>
          </View>

          {/* 로그인 폼 */}
          <View style={styles.form}>
            <InputField
              label={AUTH_CONSTANTS.STRINGS.email}
              placeholder={AUTH_CONSTANTS.STRINGS.emailPlaceholder}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              required
            />

            <InputField
              label={AUTH_CONSTANTS.STRINGS.password}
              placeholder={AUTH_CONSTANTS.STRINGS.passwordPlaceholder}
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
              <Text style={[styles.forgotPasswordText, { color: colors.primary }]}>{AUTH_CONSTANTS.STRINGS.forgotPassword}</Text>
            </TouchableOpacity>

            <Button
              title={isLoading ? AUTH_CONSTANTS.STRINGS.loginProgress : AUTH_CONSTANTS.STRINGS.login}
              onPress={handleLogin}
              loading={isLoading}
              variant="primary"
            />
          </View>

          {/* 회원가입 링크 */}
          <View style={styles.signUpContainer}>
            <Text style={[styles.signUpText, { color: colors.textSecondary }]}>{AUTH_CONSTANTS.STRINGS.signUpQuestion}</Text>
            <TouchableOpacity onPress={handleSignUp}>
              <Text style={[styles.signUpLink, { color: colors.primary }]}>{AUTH_CONSTANTS.STRINGS.signUp}</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    </div>
  )
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    maxWidth: 480,
  },
  scrollContainer: {
    paddingHorizontal: 32,
    paddingVertical: 48,
  },
  header: {
    alignItems: 'center',
    marginBottom: 48,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
  },
  form: {
    marginBottom: 32,
  },
  forgotPasswordButton: {
    alignSelf: 'flex-end',
    marginBottom: 24,
  },
  forgotPasswordText: {
    fontSize: 14,
    fontWeight: '500',
  },
  signUpContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 32,
  },
  signUpText: {
    fontSize: 14,
  },
  signUpLink: {
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 4,
  },
})

export default Login
