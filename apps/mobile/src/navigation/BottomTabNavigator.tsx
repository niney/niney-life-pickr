import React from 'react';
import { StyleSheet, Platform } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { BlurView } from '@react-native-community/blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from 'shared/contexts';
import { THEME_COLORS } from 'shared/constants';
import { HomeIcon, RestaurantIcon, SearchIcon, JobMonitorIcon, SettingsIcon } from '../components/TabBarIcons';
import HomeScreen from '../screens/HomeScreen';
import RestaurantStackNavigator from './RestaurantStackNavigator';
import RestaurantSearchScreen from '../screens/RestaurantSearchScreen';
import JobMonitorScreen from '../screens/JobMonitorScreen';
import SettingsScreen from '../screens/SettingsScreen';
import type { RootTabParamList } from './types';

const Tab = createBottomTabNavigator<RootTabParamList>();

// Tab bar background component
const TabBarBackground: React.FC<{ theme: 'light' | 'dark' }> = ({ theme }) => (
  <BlurView
    style={styles.blurView}
    blurType={theme === 'dark' ? 'dark' : 'light'}
    blurAmount={10}
    reducedTransparencyFallbackColor={theme === 'dark' ? '#1a1a1a' : '#ffffff'}
  />
);

// Tab bar icon components
const renderHomeIcon = (props: { color: string; size: number }) => (
  <HomeIcon size={props.size} color={props.color} />
);

const renderRestaurantIcon = (props: { color: string; size: number }) => (
  <RestaurantIcon size={props.size} color={props.color} />
);

const renderSearchIcon = (props: { color: string; size: number }) => (
  <SearchIcon size={props.size} color={props.color} />
);

const renderJobMonitorIcon = (props: { color: string; size: number }) => (
  <JobMonitorIcon size={props.size} color={props.color} />
);

const renderSettingsIcon = (props: { color: string; size: number }) => (
  <SettingsIcon size={props.size} color={props.color} />
);

const BottomTabNavigator: React.FC = () => {
  const { theme } = useTheme();
  const colors = THEME_COLORS[theme];
  const insets = useSafeAreaInsets();

  const tabBarHeight = Platform.OS === 'ios' ? 50 : 52;
  const totalHeight = tabBarHeight + insets.bottom;

  const tabBarBackground = React.useCallback(() => <TabBarBackground theme={theme} />, [theme]);

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: true,
        headerStyle: {
          backgroundColor: colors.headerBackground,
        },
        headerTintColor: colors.headerText,
        headerTitleStyle: {
          fontWeight: '600',
          color: colors.headerText,
        },
        tabBarStyle: {
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          elevation: 0,
          backgroundColor: 'transparent',
          borderTopWidth: 0,
          height: totalHeight,
          paddingBottom: insets.bottom,
        },
        tabBarBackground,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarShowLabel: false,
        tabBarIconStyle: {
          marginTop: 0,
        },
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          title: '홈',
          tabBarIcon: renderHomeIcon,
        }}
      />
      <Tab.Screen
        name="Restaurant"
        component={RestaurantStackNavigator}
        options={{
          title: '맛집',
          headerShown: false, // Stack Navigator가 자체 헤더를 가짐
          tabBarIcon: renderRestaurantIcon,
        }}
      />
      <Tab.Screen
        name="RestaurantSearch"
        component={RestaurantSearchScreen }
        options={{
          title: '맛집 검색',
          headerShown: false,
          tabBarIcon: renderSearchIcon,
        }}
      />
      <Tab.Screen
        name="JobMonitor"
        component={JobMonitorScreen}
        options={{
          title: 'Job 관리',
          headerShown: false,
          tabBarIcon: renderJobMonitorIcon,
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          title: '설정',
          tabBarIcon: renderSettingsIcon,
        }}
      />
    </Tab.Navigator>
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
