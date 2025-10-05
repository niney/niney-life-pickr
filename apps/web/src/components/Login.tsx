import React from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native'
import { InputField, Button } from '@shared/components'
import { useLogin } from '@shared/hooks'
import { APP_INFO_CONSTANTS, AUTH_CONSTANTS } from '@shared/constants'

interface LoginProps {
  onLoginSuccess?: () => void
}

const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
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

  const handleLogin = () => {
    handleLoginBase(onLoginSuccess)
  }

  return (
    <View style={styles.wrapper}>
      <View style={styles.container}>
        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          showsVerticalScrollIndicator={false}
        >
          {/* 헤더 */}
          <View style={styles.header}>
            <Text style={styles.title}>{APP_INFO_CONSTANTS.title}</Text>
            <Text style={styles.subtitle}>{APP_INFO_CONSTANTS.subtitle}</Text>
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
              <Text style={styles.forgotPasswordText}>{AUTH_CONSTANTS.STRINGS.forgotPassword}</Text>
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
            <Text style={styles.signUpText}>{AUTH_CONSTANTS.STRINGS.signUpQuestion}</Text>
            <TouchableOpacity onPress={handleSignUp}>
              <Text style={styles.signUpLink}>{AUTH_CONSTANTS.STRINGS.signUp}</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    height: '100%',
  },
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
    color: '#1a1a1a',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
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
    color: '#007AFF',
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
    color: '#666',
  },
  signUpLink: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: 'bold',
    marginLeft: 4,
  },
})

export default Login
