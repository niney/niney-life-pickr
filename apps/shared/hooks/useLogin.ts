import { useState } from 'react';
import { Alert, storage } from '../utils';
import { AUTH_CONSTANTS } from '../constants';
import { apiService } from '../services';

export interface LoginHookReturn {
  email: string;
  setEmail: (email: string) => void;
  password: string;
  setPassword: (password: string) => void;
  isLoading: boolean;
  handleLogin: (onSuccess?: () => void) => void;
  handleForgotPassword: () => void;
  handleSignUp: () => void;
}

export const useLogin = (): LoginHookReturn => {
  const [email, setEmail] = useState('niney@ks.com');
  const [password, setPassword] = useState('tester');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (onSuccess?: () => void) => {
    if (!email || !password) {
      Alert.error(AUTH_CONSTANTS.ERRORS.errorTitle, AUTH_CONSTANTS.ERRORS.emptyFields);
      return;
    }

    setIsLoading(true);

    try {
      // 실제 API 호출
      const response = await apiService.login({ email, password });

      if (response.result) {
        // 로그인 성공
        Alert.success(AUTH_CONSTANTS.SUCCESS.successTitle, AUTH_CONSTANTS.SUCCESS.loginSuccess);

        // 사용자 정보 저장
        if (response.data?.user) {
          await storage.setUserInfo(response.data.user);
          console.log('Logged in user:', response.data.user);
        }

        // JWT 토큰 저장 (향후 구현 시)
        if (response.data?.token) {
          await storage.setAuthToken(response.data.token);
        }

        // 성공 콜백 호출
        if (onSuccess) {
          onSuccess();
        }
      }
    } catch (error: any) {
      // 로그인 실패
      console.error('Login failed:', error);
      Alert.error(
        AUTH_CONSTANTS.ERRORS.errorTitle,
        error.message || '로그인에 실패했습니다. 이메일과 비밀번호를 확인해주세요.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = () => {
    Alert.show(
      AUTH_CONSTANTS.MESSAGES.forgotPasswordTitle,
      AUTH_CONSTANTS.MESSAGES.forgotPasswordMessage
    );
  };

  const handleSignUp = () => {
    Alert.show(AUTH_CONSTANTS.MESSAGES.signUpTitle, AUTH_CONSTANTS.MESSAGES.signUpMessage);
  };

  return {
    email,
    setEmail,
    password,
    setPassword,
    isLoading,
    handleLogin,
    handleForgotPassword,
    handleSignUp,
  };
};
