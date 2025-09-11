import React, {useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
} from 'react-native';
import {Card, Button} from 'react-native-elements';

const HomeScreen = () => {
  const [count, setCount] = useState(0);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.content}>
          <Text style={styles.title}>Niney Life Pickr</Text>
          <Text style={styles.subtitle}>인생의 선택을 도와드립니다</Text>

          <Card containerStyle={styles.counterCard}>
            <Text style={styles.counterLabel}>카운터 테스트</Text>
            <Text style={styles.counterValue}>{count}</Text>
            <Button
              title="증가"
              onPress={() => setCount(count + 1)}
              buttonStyle={styles.incrementButton}
              titleStyle={styles.incrementButtonText}
            />
          </Card>

          <View style={styles.menuGrid}>
            <TouchableOpacity style={styles.menuButton}>
              <Text style={styles.menuButtonText}>음식 선택</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuButton}>
              <Text style={styles.menuButtonText}>장소 선택</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuButton}>
              <Text style={styles.menuButtonText}>활동 선택</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuButton}>
              <Text style={styles.menuButtonText}>설정</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f3f4f6',
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    padding: 20,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
    marginBottom: 30,
  },
  counterCard: {
    width: '100%',
    borderRadius: 12,
    padding: 20,
    backgroundColor: '#7c3aed',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    marginBottom: 30,
  },
  counterLabel: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 10,
    textAlign: 'center',
  },
  counterValue: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 20,
  },
  incrementButton: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    paddingVertical: 12,
  },
  incrementButtonText: {
    color: '#7c3aed',
    fontWeight: 'bold',
    fontSize: 16,
  },
  menuGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    width: '100%',
  },
  menuButton: {
    width: '48%',
    backgroundColor: '#e5e7eb',
    borderRadius: 8,
    paddingVertical: 20,
    paddingHorizontal: 15,
    marginBottom: 15,
    alignItems: 'center',
  },
  menuButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#374151',
  },
});

export default HomeScreen;