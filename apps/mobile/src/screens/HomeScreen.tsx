import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from 'shared/components';
import { useAuth } from 'shared/hooks';

interface HomeScreenProps {
  onLogout: () => Promise<void>;
}

const HomeScreen: React.FC<HomeScreenProps> = ({ onLogout }) => {
  const { user } = useAuth();

  const handleLogout = async () => {
    await onLogout();
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        {/* 헤더 */}
        <View style={styles.header}>
          <Text style={styles.title}>홈</Text>
          <Text style={styles.subtitle}>로그인에 성공했습니다!</Text>

          {/* 사용자 정보 */}
          {user && (
            <View style={styles.userInfo}>
              <Text style={styles.userInfoLabel}>사용자 정보</Text>
              <View style={styles.userInfoRow}>
                <Text style={styles.userInfoKey}>이메일:</Text>
                <Text style={styles.userInfoValue}>{user.email}</Text>
              </View>
              <View style={styles.userInfoRow}>
                <Text style={styles.userInfoKey}>사용자명:</Text>
                <Text style={styles.userInfoValue}>{user.username}</Text>
              </View>
            </View>
          )}
        </View>

        {/* 콘텐츠 */}
        <View style={styles.content}>
          <Text style={styles.placeholderText}>
            홈 화면 콘텐츠가 여기에 표시됩니다.
          </Text>
        </View>

        {/* 로그아웃 버튼 */}
        <View style={styles.logoutButtonContainer}>
          <Button
            title="로그아웃"
            onPress={handleLogout}
            variant="secondary"
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContainer: {
    flexGrow: 1,
    paddingBottom: 24,
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
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  userInfo: {
    marginTop: 24,
    padding: 20,
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    width: '100%',
  },
  userInfoLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 12,
  },
  userInfoRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  userInfoKey: {
    fontSize: 14,
    color: '#666',
    width: 80,
  },
  userInfoValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 48,
  },
  placeholderText: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
  },
  logoutButtonContainer: {
    paddingHorizontal: 24,
    paddingTop: 24,
  },
});

export default HomeScreen;
