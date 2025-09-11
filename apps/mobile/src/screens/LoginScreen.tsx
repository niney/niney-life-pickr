import React, { useState } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native'

function LoginScreen({ navigation }: any) {
  const [email, setEmail] = useState('niney@ks.com')
  const [password, setPassword] = useState('tester')

  const handleLogin = () => {
    // TODO: Implement actual login logic with API
    // For now, just navigate to the main screen
    navigation.navigate('Main')
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <View className="flex-1 justify-center px-6">
          <View className="items-center mb-12">
            <Text className="text-3xl font-bold text-gray-900 mb-2">
              Niney Life Pickr
            </Text>
            <Text className="text-base text-gray-600">
              인생의 선택을 도와드립니다
            </Text>
          </View>

          <View className="w-full">
            <View className="mb-4">
              <Text className="text-sm font-medium text-gray-700 mb-1.5">
                이메일
              </Text>
              <TextInput
                className="border border-gray-300 rounded-lg px-3.5 py-2.5 text-base text-gray-900 bg-white"
                value={email}
                onChangeText={setEmail}
                placeholder="이메일 주소"
                keyboardType="email-address"
                autoCapitalize="none"
                placeholderTextColor="#9ca3af"
              />
            </View>

            <View className="mb-4">
              <Text className="text-sm font-medium text-gray-700 mb-1.5">
                비밀번호
              </Text>
              <TextInput
                className="border border-gray-300 rounded-lg px-3.5 py-2.5 text-base text-gray-900 bg-white"
                value={password}
                onChangeText={setPassword}
                placeholder="비밀번호"
                secureTextEntry
                placeholderTextColor="#9ca3af"
              />
            </View>

            <TouchableOpacity
              className="bg-primary-600 rounded-lg py-3 items-center mt-6"
              onPress={handleLogin}
              activeOpacity={0.8}
            >
              <Text className="text-white text-base font-semibold">
                로그인
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              className="py-3 items-center mt-4"
              onPress={() => navigation.navigate('Register')}
              activeOpacity={0.7}
            >
              <Text className="text-primary-600 text-sm">
                계정이 없으신가요? 회원가입
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

export default LoginScreen
