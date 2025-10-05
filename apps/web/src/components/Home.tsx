import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { useAuth } from '@shared/hooks'
import { Button } from '@shared/components'

interface HomeProps {
  onLogout: () => Promise<void>
}

const Home: React.FC<HomeProps> = ({ onLogout }) => {
  const { user } = useAuth()

  const handleLogout = async () => {
    await onLogout()
    window.location.href = '/login'
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>홈</Text>
        <Text style={styles.subtitle}>로그인에 성공했습니다!</Text>
        {user && (
          <View style={styles.userInfo}>
            <Text style={styles.userInfoText}>이메일: {user.email}</Text>
            <Text style={styles.userInfoText}>사용자명: {user.username}</Text>
          </View>
        )}
      </View>
      <View style={styles.content}>
        <Text style={styles.placeholderText}>홈 화면 콘텐츠가 여기에 표시됩니다.</Text>
        <View style={styles.logoutButtonContainer}>
          <Button title="로그아웃" onPress={handleLogout} variant="secondary" />
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#fff',
    paddingHorizontal: 24,
    paddingVertical: 32,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
  userInfo: {
    marginTop: 16,
    padding: 16,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    width: '100%',
    maxWidth: 400,
  },
  userInfoText: {
    fontSize: 14,
    color: '#333',
    marginBottom: 4,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  placeholderText: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
    marginBottom: 32,
  },
  logoutButtonContainer: {
    width: '100%',
    maxWidth: 300,
  },
})

export default Home