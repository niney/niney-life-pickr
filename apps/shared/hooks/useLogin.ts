import { useState } from 'react';
import { Alert } from 'react-native';
import { AUTH_CONSTANTS } from '../constants';

export interface LoginHookReturn {
  email: string;
  setEmail: (email: string) => void;
  password: string;
  setPassword: (password: string) => void;
  isLoading: boolean;
  handleLogin: () => void;
  handleForgotPassword: () => void;
  handleSignUp: () => void;
}

export const useLogin = (): LoginHookReturn => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = () => {
    if (!email || !password) {
      Alert.alert(AUTH_CONSTANTS.ERRORS.errorTitle, AUTH_CONSTANTS.ERRORS.emptyFields);
      return;
    }

    setIsLoading(true);
    // 여기에 실제 로그인 로직을 구현할 수 있습니다
    setTimeout(() => {
      setIsLoading(false);
      Alert.alert(AUTH_CONSTANTS.SUCCESS.successTitle, AUTH_CONSTANTS.SUCCESS.loginSuccess);
    }, 1000);
  };

  const handleForgotPassword = () => {
    Alert.alert(
      AUTH_CONSTANTS.MESSAGES.forgotPasswordTitle,
      AUTH_CONSTANTS.MESSAGES.forgotPasswordMessage
    );
  };

  const handleSignUp = () => {
    Alert.alert(AUTH_CONSTANTS.MESSAGES.signUpTitle, AUTH_CONSTANTS.MESSAGES.signUpMessage);
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
