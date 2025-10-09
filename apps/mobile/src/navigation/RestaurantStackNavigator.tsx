import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTheme } from 'shared/contexts';
import { THEME_COLORS } from 'shared/constants';
import RestaurantListScreen from '../screens/RestaurantListScreen';
import RestaurantDetailScreen from '../screens/RestaurantDetailScreen';
import type { RestaurantStackParamList } from './types';

const Stack = createNativeStackNavigator<RestaurantStackParamList>();

const RestaurantStackNavigator: React.FC = () => {
  const { theme } = useTheme();
  const colors = THEME_COLORS[theme];

  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: colors.headerBackground,
        },
        headerTintColor: colors.headerText,
        headerTitleStyle: {
          fontWeight: '600',
        },
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen
        name="RestaurantList"
        component={RestaurantListScreen}
        options={{
          title: '맛집',
          headerShown: false, // 헤더 숨김
        }}
      />
      <Stack.Screen
        name="RestaurantDetail"
        component={RestaurantDetailScreen}
        options={({ route }) => ({
          title: route.params?.restaurant?.name || '레스토랑',
          headerShown: true,
          headerBackTitle: '뒤로',
        })}
      />
    </Stack.Navigator>
  );
};

export default RestaurantStackNavigator;
