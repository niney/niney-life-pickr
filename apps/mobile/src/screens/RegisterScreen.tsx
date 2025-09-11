import React, { useState } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native'

function RegisterScreen({ navigation }: any) {
  const [email, setEmail] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const handleRegister = () => {
    // TODO: Implement actual registration logic with API
    // For now, just navigate back to login
    navigation.navigate('Login')
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}
          className="px-6"
        >
          <View className="py-8">
            <View className="items-center mb-12">
              <Text className="text-3xl font-bold text-gray-900 mb-2">
                회원가입
              </Text>
              <Text className="text-base text-gray-600">
                새 계정을 만들어주세요
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
                  사용자명
                </Text>
                <TextInput
                  className="border border-gray-300 rounded-lg px-3.5 py-2.5 text-base text-gray-900 bg-white"
                  value={username}
                  onChangeText={setUsername}
                  placeholder="사용자명"
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

              <View className="mb-4">
                <Text className="text-sm font-medium text-gray-700 mb-1.5">
                  비밀번호 확인
                </Text>
                <TextInput
                  className="border border-gray-300 rounded-lg px-3.5 py-2.5 text-base text-gray-900 bg-white"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder="비밀번호 확인"
                  secureTextEntry
                  placeholderTextColor="#9ca3af"
                />
              </View>

              <TouchableOpacity
                className="bg-primary-600 rounded-lg py-3 items-center mt-6"
                onPress={handleRegister}
                activeOpacity={0.8}
              >
                <Text className="text-white text-base font-semibold">
                  회원가입
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                className="py-3 items-center mt-4"
                onPress={() => navigation.navigate('Login')}
                activeOpacity={0.7}
              >
                <Text className="text-primary-600 text-sm">
                  이미 계정이 있으신가요? 로그인
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

export default RegisterScreen
