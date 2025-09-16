import React from 'react'
import {
  TextInput,
  StyleSheet,
  Platform,
  TextInputProps,
  ViewStyle,
  TextStyle,
  useColorScheme,
} from 'react-native'

interface InputProps extends Omit<TextInputProps, 'style'> {
  value: string
  onChangeText: (text: string) => void
  placeholder?: string
  position?: 'top' | 'bottom' | 'middle' | 'single'
  hasError?: boolean
  type?: 'text' | 'email' | 'password' | 'number' | 'tel'
  testID?: string
}

export const Input = ({
  value,
  onChangeText,
  placeholder,
  position = 'single',
  hasError = false,
  type = 'text',
  testID,
  ...props
}: InputProps) => {
  const colorScheme = useColorScheme()
  const isDarkMode = colorScheme === 'dark'

  const styles = StyleSheet.create({
    input: {
      width: '100%',
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderWidth: 1,
      borderColor: hasError
        ? '#ef4444'
        : isDarkMode
        ? '#4b5556'
        : '#d1d5db',
      color: isDarkMode ? '#ffffff' : '#111827',
      backgroundColor: isDarkMode ? '#374151' : '#ffffff',
      fontSize: 14,
      ...getBorderRadius(position),
      // Web-specific styles
      ...(Platform.OS === 'web' && {
        outlineStyle: 'none',
        outlineWidth: 0,
      } as any),
    } as ViewStyle & TextStyle,
  })

  const getKeyboardType = () => {
    switch (type) {
      case 'email':
        return 'email-address' as const
      case 'number':
        return 'numeric' as const
      case 'tel':
        return 'phone-pad' as const
      default:
        return 'default' as const
    }
  }

  const getAutoCapitalize = () => {
    if (type === 'email') return 'none' as const
    return 'sentences' as const
  }

  return (
    <TextInput
      style={styles.input}
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={isDarkMode ? '#9ca3af' : '#6b7280'}
      keyboardType={getKeyboardType()}
      secureTextEntry={type === 'password'}
      autoCapitalize={getAutoCapitalize()}
      testID={testID}
      {...props}
    />
  )
}

function getBorderRadius(position: 'top' | 'bottom' | 'middle' | 'single'): ViewStyle {
  switch (position) {
    case 'top':
      return {
        borderTopLeftRadius: 6,
        borderTopRightRadius: 6,
        borderBottomLeftRadius: 0,
        borderBottomRightRadius: 0,
      }
    case 'bottom':
      return {
        borderTopLeftRadius: 0,
        borderTopRightRadius: 0,
        borderBottomLeftRadius: 6,
        borderBottomRightRadius: 6,
      }
    case 'middle':
      return {
        borderTopLeftRadius: 0,
        borderTopRightRadius: 0,
        borderBottomLeftRadius: 0,
        borderBottomRightRadius: 0,
      }
    case 'single':
    default:
      return {
        borderRadius: 6,
      }
  }
}