import React, { useState } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  ScrollView,
} from 'react-native'
import { authService, storage } from '../services/auth.service'
import { formFields, authText } from '@niney/shared'

function LoginScreen({ navigation }: any) {
  const [email, setEmail] = useState('niney@ks.com')
  const [password, setPassword] = useState('tester')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async () => {
    setError('')
    setIsLoading(true)

    try {
      const response = await authService.login({ email, password })

      if (!response.result) {
        throw new Error(response.message || authText.error.loginFailed)
      }

      // Handle successful login
      console.log('Login successful:', response.data?.user)
      await storage.setUserData(response.data?.user)
      // TODO: Set auth token when JWT is implemented
      // await storage.setAuthToken(response.data?.token)
      // Navigate to main screen
      navigation.navigate('Main')

    } catch (err) {
      setError(err instanceof Error ? err.message : authText.error.generic)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          showsVerticalScrollIndicator={false}
        >
          <View className="flex-1 items-center justify-center py-12 px-4">
            <View className="w-full" style={{ maxWidth: 448 }}>
              <View>
                <Text className="mt-6 text-center text-3xl font-extrabold text-gray-900">
                  {authText.login.title}
                </Text>
                <Text className="mt-2 text-center text-sm text-gray-600">
                  {authText.login.subtitle}
                </Text>
                <View className="mt-2 flex-row justify-center">
                  <Text className="text-center text-sm text-gray-600">
                    {authText.login.noAccount}{' '}
                  </Text>
                  <TouchableOpacity onPress={() => navigation.navigate('Register')}>
                    <Text className="font-medium text-indigo-600">
                      {authText.login.registerLink}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View className="mt-8">
                <View className="rounded-md shadow-sm">
                  <View>
                    <Text className="absolute" style={{ width: 1, height: 1, padding: 0, margin: -1, overflow: 'hidden' }}>
                      {formFields.email.label}
                    </Text>
                    <TextInput
                      className="w-full px-3 py-2 border border-gray-300 text-gray-900 bg-white rounded-t-md text-sm"
                      value={email}
                      onChangeText={setEmail}
                      placeholder={formFields.email.placeholder}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoComplete={formFields.email.autoComplete}
                      placeholderTextColor="#9ca3af"
                    />
                  </View>
                  <View style={{ marginTop: -1 }}>
                    <Text className="absolute" style={{ width: 1, height: 1, padding: 0, margin: -1, overflow: 'hidden' }}>
                      {formFields.password.label}
                    </Text>
                    <TextInput
                      className="w-full px-3 py-2 border border-gray-300 text-gray-900 bg-white rounded-b-md text-sm"
                      value={password}
                      onChangeText={setPassword}
                      placeholder={formFields.password.placeholder}
                      secureTextEntry
                      autoComplete={formFields.password.autoComplete}
                      placeholderTextColor="#9ca3af"
                    />
                  </View>
                </View>

                {error ? (
                  <View className="rounded-md bg-red-50 p-4 mt-6">
                    <Text className="text-sm text-red-800">{error}</Text>
                  </View>
                ) : null}

                <View className="mt-6">
                  <TouchableOpacity
                    className={`w-full flex-row justify-center py-2 px-4 rounded-md ${isLoading ? 'bg-indigo-400' : 'bg-indigo-600'}`}
                    onPress={handleSubmit}
                    disabled={isLoading}
                    activeOpacity={0.8}
                  >
                    {isLoading ? (
                      <ActivityIndicator color="white" size="small" />
                    ) : (
                      <Text className="text-white text-sm font-medium">
                        {isLoading ? authText.login.loadingButton : authText.login.submitButton}
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

export default LoginScreen
