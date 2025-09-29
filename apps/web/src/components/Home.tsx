import React from 'react'
import { View, Text, StyleSheet } from 'react-native'

const Home: React.FC = () => {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>홈</Text>
        <Text style={styles.subtitle}>로그인에 성공했습니다!</Text>
      </View>
      <View style={styles.content}>
        <Text style={styles.placeholderText}>홈 화면 콘텐츠가 여기에 표시됩니다.</Text>
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
  },
})

export default Home