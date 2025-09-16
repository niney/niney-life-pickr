import React from 'react'
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  StyleSheet,
  ViewStyle,
  TextStyle,
} from 'react-native'

interface ButtonProps {
  children: React.ReactNode
  onPress?: () => void
  disabled?: boolean
  loading?: boolean
  variant?: 'primary' | 'secondary' | 'danger'
  testID?: string
}

export const Button = ({
  children,
  onPress,
  disabled = false,
  loading = false,
  variant = 'primary',
  testID,
}: ButtonProps) => {
  const styles = StyleSheet.create({
    button: {
      width: '100%',
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      paddingVertical: 8,
      paddingHorizontal: 16,
      borderRadius: 6,
      opacity: disabled || loading ? 0.5 : 1,
      ...getButtonStyle(variant, disabled, loading),
    } as ViewStyle,
    text: {
      fontSize: 14,
      fontWeight: '500',
      ...getTextStyle(variant),
    } as TextStyle,
  })

  return (
    <TouchableOpacity
      style={styles.button}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
      testID={testID}
    >
      {loading ? (
        <ActivityIndicator color={getTextColor(variant)} size="small" />
      ) : typeof children === 'string' ? (
        <Text style={styles.text}>{children}</Text>
      ) : (
        children
      )}
    </TouchableOpacity>
  )
}

function getButtonStyle(
  variant: 'primary' | 'secondary' | 'danger',
  disabled: boolean,
  loading: boolean
): ViewStyle {
  const baseStyle: ViewStyle = {}

  if (disabled || loading) {
    switch (variant) {
      case 'primary':
        baseStyle.backgroundColor = '#818cf8'
        break
      case 'danger':
        baseStyle.backgroundColor = '#ef4444'
        break
      case 'secondary':
        baseStyle.backgroundColor = '#d1d5db'
        baseStyle.borderWidth = 1
        baseStyle.borderColor = '#d1d5db'
        break
    }
  } else {
    switch (variant) {
      case 'primary':
        baseStyle.backgroundColor = '#4f46e5'
        break
      case 'danger':
        baseStyle.backgroundColor = '#dc2626'
        break
      case 'secondary':
        baseStyle.backgroundColor = '#ffffff'
        baseStyle.borderWidth = 1
        baseStyle.borderColor = '#d1d5db'
        break
    }
  }

  return baseStyle
}

function getTextStyle(variant: 'primary' | 'secondary' | 'danger'): TextStyle {
  const textStyle: TextStyle = {}

  switch (variant) {
    case 'secondary':
      textStyle.color = '#374151'
      break
    default:
      textStyle.color = '#ffffff'
      break
  }

  return textStyle
}

function getTextColor(variant: 'primary' | 'secondary' | 'danger'): string {
  switch (variant) {
    case 'secondary':
      return '#374151'
    default:
      return '#ffffff'
  }
}