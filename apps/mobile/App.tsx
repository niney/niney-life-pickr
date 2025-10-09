/**
 * Life Pickr Mobile App
 *
 * @format
 */

import { StatusBar, StyleSheet, View, Text, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider, SocketProvider, useTheme } from 'shared/contexts';
import LoginScreen from './src/screens/LoginScreen';
import BottomTabNavigator from './src/navigation/BottomTabNavigator';
import { useAuth } from 'shared/hooks';

function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <SocketProvider>
          <AppContent />
        </SocketProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

function AppContent() {
  const { isAuthenticated, isLoading, checkAuth } = useAuth();
  const { theme } = useTheme();

  const handleLoginSuccess = async () => {
    // 로그인 성공 시 storage에서 다시 로드하여 화면 전환
    await checkAuth();
  };

  // 로딩 중
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar barStyle={theme === 'dark' ? 'light-content' : 'dark-content'} />
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle={theme === 'dark' ? 'light-content' : 'dark-content'} />
      {isAuthenticated ? (
        <NavigationContainer>
          <BottomTabNavigator />
        </NavigationContainer>
      ) : (
        <LoginScreen onLoginSuccess={handleLoginSuccess} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
});

export default App;
