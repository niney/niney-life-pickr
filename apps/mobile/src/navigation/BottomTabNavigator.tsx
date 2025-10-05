import React from 'react';
import { StyleSheet, Platform, Text } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { BlurView } from '@react-native-community/blur';
import { useTheme } from 'shared/contexts';
import { THEME_COLORS } from 'shared/constants';
import HomeScreen from '../screens/HomeScreen';
import RestaurantScreen from '../screens/RestaurantScreen';
import SettingsScreen from '../screens/SettingsScreen';

const Tab = createBottomTabNavigator();

const BottomTabNavigator: React.FC = () => {
  const { theme } = useTheme();
  const colors = THEME_COLORS[theme];

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: true,
        headerStyle: {
          backgroundColor: colors.surface,
        },
        headerTintColor: colors.text,
        headerTitleStyle: {
          fontWeight: '600',
        },
        tabBarStyle: {
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          elevation: 0,
          backgroundColor: 'transparent',
          borderTopWidth: 0,
          height: Platform.OS === 'ios' ? 88 : 68,
        },
        tabBarBackground: () => (
          <BlurView
            style={styles.blurView}
            blurType={theme === 'dark' ? 'dark' : 'light'}
            blurAmount={10}
            reducedTransparencyFallbackColor={theme === 'dark' ? '#1a1a1a' : '#ffffff'}
          />
        ),
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
          marginBottom: Platform.OS === 'ios' ? 0 : 8,
        },
        tabBarIconStyle: {
          marginTop: Platform.OS === 'ios' ? 0 : 8,
        },
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          title: '홈',
          tabBarIcon: ({ color, size }) => (
            <TabIcon name="home" color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="Restaurant"
        component={RestaurantScreen}
        options={{
          title: '맛집',
          tabBarIcon: ({ color, size }) => (
            <TabIcon name="restaurant" color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          title: '설정',
          tabBarIcon: ({ color, size }) => (
            <TabIcon name="settings" color={color} size={size} />
          ),
        }}
      />
    </Tab.Navigator>
  );
};

// 간단한 아이콘 컴포넌트 (추후 react-native-vector-icons로 교체 가능)
const TabIcon: React.FC<{ name: string; color: string; size: number }> = ({ name, size }) => {
  const getEmoji = () => {
    switch (name) {
      case 'home':
        return '🏠';
      case 'restaurant':
        return '🍴';
      case 'settings':
        return '⚙️';
      default:
        return '•';
    }
  };

  return (
    <Text style={{ fontSize: size }}>
      {getEmoji()}
    </Text>
  );
};

const styles = StyleSheet.create({
  blurView: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    right: 0,
  },
});

export default BottomTabNavigator;
