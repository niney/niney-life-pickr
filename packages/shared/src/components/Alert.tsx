import React from 'react'
import { View, Text, StyleSheet, ViewStyle, TextStyle, useColorScheme } from 'react-native'

interface AlertProps {
  children: React.ReactNode
  variant?: 'error' | 'success' | 'warning' | 'info'
  testID?: string
}

export const Alert = ({
  children,
  variant = 'error',
  testID,
}: AlertProps) => {
  const colorScheme = useColorScheme()
  const isDarkMode = colorScheme === 'dark'

  const styles = StyleSheet.create({
    container: {
      borderRadius: 6,
      backgroundColor: getBackgroundColor(variant, isDarkMode),
      padding: 16,
    } as ViewStyle,
    text: {
      fontSize: 14,
      color: getTextColor(variant, isDarkMode),
    } as TextStyle,
  })

  return (
    <View style={styles.container} testID={testID}>
      {typeof children === 'string' ? (
        <Text style={styles.text}>{children}</Text>
      ) : (
        children
      )}
    </View>
  )
}

function getBackgroundColor(
  variant: 'error' | 'success' | 'warning' | 'info',
  isDark: boolean
): string {
  if (isDark) {
    switch (variant) {
      case 'error':
        return '#991b1b20'
      case 'success':
        return '#16a34a20'
      case 'warning':
        return '#ca8a0420'
      case 'info':
        return '#2563eb20'
      default:
        return '#991b1b20'
    }
  }
  switch (variant) {
    case 'error':
      return '#fef2f2'
    case 'success':
      return '#f0fdf4'
    case 'warning':
      return '#fefce8'
    case 'info':
      return '#eff6ff'
    default:
      return '#fef2f2'
  }
}

function getTextColor(
  variant: 'error' | 'success' | 'warning' | 'info',
  isDark: boolean
): string {
  if (isDark) {
    switch (variant) {
      case 'error':
        return '#ef4444'
      case 'success':
        return '#86efac'
      case 'warning':
        return '#fde047'
      case 'info':
        return '#93c5fd'
      default:
        return '#ef4444'
    }
  }
  switch (variant) {
    case 'error':
      return '#991b1b'
    case 'success':
      return '#166534'
    case 'warning':
      return '#854d0e'
    case 'info':
      return '#1e40af'
    default:
      return '#991b1b'
  }
}