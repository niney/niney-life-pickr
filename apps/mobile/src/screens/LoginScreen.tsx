import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const LoginScreen: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = () => {
    if (!email || !password) {
      Alert.alert('오류', '이메일과 비밀번호를 모두 입력해주세요.');
      return;
    }
    
    setIsLoading(true);
    // 여기에 실제 로그인 로직을 구현할 수 있습니다
    setTimeout(() => {
      setIsLoading(false);
      Alert.alert('성공', '로그인이 완료되었습니다!');
    }, 1000);
  };

  const handleForgotPassword = () => {
    Alert.alert('비밀번호 찾기', '비밀번호 찾기 기능을 구현할 예정입니다.');
  };

  const handleSignUp = () => {
    Alert.alert('회원가입', '회원가입 페이지로 이동합니다.');
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoidingView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          keyboardShouldPersistTaps="handled"
        >
          {/* 헤더 */}
          <View style={styles.header}>
            <Text style={styles.title}>Life Pickr</Text>
            <Text style={styles.subtitle}>당신의 라이프스타일을 선택하세요</Text>
          </View>

          {/* 로그인 폼 */}
          <View style={styles.form}>
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>이메일</Text>
              <TextInput
                style={styles.input}
                placeholder="이메일을 입력하세요"
                placeholderTextColor="#999"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>비밀번호</Text>
              <TextInput
                style={styles.input}
                placeholder="비밀번호를 입력하세요"
                placeholderTextColor="#999"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

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

          {/* 구분선 */}
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>또는</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* 소셜 로그인 */}
          <View style={styles.socialLogin}>
            <TouchableOpacity style={[styles.socialButton, styles.googleButton]}>
              <Text style={styles.socialButtonText}>Google로 계속하기</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.socialButton, styles.appleButton]}>
              <Text style={[styles.socialButtonText, styles.appleButtonText]}>
                Apple로 계속하기
              </Text>
            </TouchableOpacity>
          </View>

          {/* 회원가입 링크 */}
          <View style={styles.signUpContainer}>
            <Text style={styles.signUpText}>계정이 없으신가요? </Text>
            <TouchableOpacity onPress={handleSignUp}>
              <Text style={styles.signUpLink}>회원가입</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
  header: {
    alignItems: 'center',
    marginBottom: 48,
    marginTop: 32,
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
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    height: 52,
    borderWidth: 1,
    borderColor: '#e1e1e1',
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    backgroundColor: '#fafafa',
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
  loginButton: {
    height: 52,
    backgroundColor: '#007AFF',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#007AFF',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  loginButtonDisabled: {
    backgroundColor: '#ccc',
    shadowOpacity: 0,
    elevation: 0,
  },
  loginButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 32,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#e1e1e1',
  },
  dividerText: {
    marginHorizontal: 16,
    fontSize: 14,
    color: '#999',
  },
  socialLogin: {
    marginBottom: 32,
  },
  socialButton: {
    height: 52,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
  },
  googleButton: {
    backgroundColor: '#fff',
    borderColor: '#e1e1e1',
  },
  appleButton: {
    backgroundColor: '#000',
    borderColor: '#000',
  },
  socialButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  appleButtonText: {
    color: '#fff',
  },
  signUpContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  signUpText: {
    fontSize: 14,
    color: '#666',
  },
  signUpLink: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '600',
  },
});

export default LoginScreen;
