import React, { useState } from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { useAuth } from '@shared/hooks'
import { useTheme } from '@shared/contexts'
import { THEME_COLORS } from '@shared/constants'
import Header from './Header'
import Drawer from './Drawer'

interface HomeProps {
  onLogout: () => Promise<void>
}

const Home: React.FC<HomeProps> = ({ onLogout }) => {
  const { user } = useAuth()
  const { theme } = useTheme()
  const [drawerVisible, setDrawerVisible] = useState(false)

  const colors = THEME_COLORS[theme]

  const handleLogout = async () => {
    await onLogout()
    window.location.href = '/login'
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Header onMenuPress={() => setDrawerVisible(true)} />

      <View style={styles.content}>
        <View style={[styles.welcomeSection, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.title, { color: colors.text }]}>환영합니다!</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>로그인에 성공했습니다.</Text>
          {user && (
            <View style={[styles.userInfo, { backgroundColor: colors.background, borderColor: colors.border }]}>
              <Text style={[styles.userInfoText, { color: colors.text }]}>이메일: {user.email}</Text>
              <Text style={[styles.userInfoText, { color: colors.text }]}>사용자명: {user.username}</Text>
            </View>
          )}
        </View>

        <Text style={[styles.placeholderText, { color: colors.textSecondary }]}>
          홈 화면 콘텐츠가 여기에 표시됩니다.
        </Text>
      </View>

      <Drawer
        visible={drawerVisible}
        onClose={() => setDrawerVisible(false)}
        onLogout={handleLogout}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    height: '100%',
  },
  content: {
    flex: 1,
    padding: 24,
  },
  welcomeSection: {
    padding: 32,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 32,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 16,
  },
  userInfo: {
    marginTop: 16,
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    width: '100%',
    maxWidth: 400,
  },
  userInfoText: {
    fontSize: 14,
    marginBottom: 4,
  },
  placeholderText: {
    fontSize: 16,
    textAlign: 'center',
  },
})

export default Home
