# MOBILE-NAVIGATION.md

> **Last Updated**: 2025-10-23 22:00
> **Purpose**: React Navigation setup with Bottom Tabs and Stack Navigator

---

## Table of Contents

1. [Overview](#1-overview)
2. [Navigation Structure](#2-navigation-structure)
3. [Bottom Tab Navigator](#3-bottom-tab-navigator)
4. [Restaurant Stack Navigator](#4-restaurant-stack-navigator)
5. [Navigation Types](#5-navigation-types)
6. [Theme Integration](#6-theme-integration)
7. [Tab Bar Customization](#7-tab-bar-customization)
8. [Screen Options](#8-screen-options)
9. [Navigation Patterns](#9-navigation-patterns)
10. [Related Documentation](#10-related-documentation)

---

## 1. Overview

The mobile app uses **React Navigation 7.x** with a two-level navigation hierarchy: Bottom Tab Navigator (main navigation) containing nested Stack Navigators (screen stacks).

### Key Technologies
- **@react-navigation/native**: 7.1.18
- **@react-navigation/native-stack**: 7.3.27
- **@react-navigation/bottom-tabs**: 7.4.8
- **react-native-safe-area-context**: Safe area insets
- **react-native-screens**: Native screen optimization
- **@react-native-community/blur**: Tab bar blur effect

### Navigation Architecture
```
NavigationContainer
└── BottomTabNavigator (3 tabs)
    ├── HomeScreen
    ├── RestaurantStackNavigator (nested stack)
    │   ├── RestaurantList
    │   └── RestaurantDetail
    └── SettingsScreen
```

### Key Features
- **Theme Integration**: Dynamic colors from ThemeContext
- **Blur Tab Bar**: iOS-style blur effect with theme support
- **Type Safety**: Full TypeScript type definitions
- **Safe Area Support**: Proper inset handling for notched devices
- **Platform Optimization**: Different heights for iOS/Android

---

## 2. Navigation Structure

### 2.1 App Entry Point

**Location**: `apps/mobile/App.tsx`

```typescript
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider, SocketProvider, useTheme } from 'shared/contexts';
import BottomTabNavigator from './src/navigation/BottomTabNavigator';

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
  const { isAuthenticated, isLoading } = useAuth();
  const { theme } = useTheme();

  if (isLoading) {
    return <LoadingScreen />;
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
```

**Provider Hierarchy**:
1. **SafeAreaProvider**: Provides safe area insets for notched devices
2. **ThemeProvider**: Global theme state (light/dark mode)
3. **SocketProvider**: Socket.io connection for real-time updates
4. **NavigationContainer**: React Navigation root container (only if authenticated)

### 2.2 Conditional Rendering

**Pattern**: LoginScreen vs NavigationContainer based on auth state

```typescript
{isAuthenticated ? (
  <NavigationContainer>
    <BottomTabNavigator />
  </NavigationContainer>
) : (
  <LoginScreen onLoginSuccess={handleLoginSuccess} />
)}
```

**Why?**:
- Mobile doesn't use route-based protection like web
- Simple conditional rendering is more efficient
- Prevents navigation stack from mounting before auth

---

## 3. Bottom Tab Navigator

### 3.1 File Location

**Location**: `apps/mobile/src/navigation/BottomTabNavigator.tsx`

### 3.2 Implementation

```typescript
import React from 'react';
import { StyleSheet, Platform } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { BlurView } from '@react-native-community/blur';
import { useTheme } from 'shared/contexts';
import { THEME_COLORS } from 'shared/constants';
import { HomeIcon, RestaurantIcon, SettingsIcon } from '../components/TabBarIcons';
import HomeScreen from '../screens/HomeScreen';
import RestaurantStackNavigator from './RestaurantStackNavigator';
import SettingsScreen from '../screens/SettingsScreen';
import type { RootTabParamList } from './types';

const Tab = createBottomTabNavigator<RootTabParamList>();

const BottomTabNavigator: React.FC = () => {
  const { theme } = useTheme();
  const colors = THEME_COLORS[theme];

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
            <HomeIcon size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Restaurant"
        component={RestaurantStackNavigator}
        options={{
          title: '맛집',
          headerShown: false, // Stack Navigator has its own header
          tabBarIcon: ({ color, size }) => (
            <RestaurantIcon size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          title: '설정',
          tabBarIcon: ({ color, size }) => (
            <SettingsIcon size={size} color={color} />
          ),
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
```

### 3.3 Screen Options Explained

#### Header Configuration
```typescript
headerShown: true,
headerStyle: {
  backgroundColor: colors.headerBackground,
},
headerTintColor: colors.headerText,
headerTitleStyle: {
  fontWeight: '600',
  color: colors.headerText,
},
```

**Effect**:
- Each tab screen has a header
- Header colors from theme
- Font weight 600 for titles

#### Tab Bar Style
```typescript
tabBarStyle: {
  position: 'absolute',
  bottom: 0,
  left: 0,
  right: 0,
  elevation: 0,
  backgroundColor: 'transparent',
  borderTopWidth: 0,
  height: Platform.OS === 'ios' ? 88 : 68,
}
```

**Key Settings**:
- `position: 'absolute'`: Overlay tab bar on content (allows blur)
- `backgroundColor: 'transparent'`: See blur effect behind
- `borderTopWidth: 0`: Remove default border
- `height`: iOS 88px (safe area), Android 68px

#### Tab Bar Background (Blur Effect)
```typescript
tabBarBackground: () => (
  <BlurView
    style={styles.blurView}
    blurType={theme === 'dark' ? 'dark' : 'light'}
    blurAmount={10}
    reducedTransparencyFallbackColor={theme === 'dark' ? '#1a1a1a' : '#ffffff'}
  />
)
```

**Why BlurView?**:
- iOS-style translucent tab bar
- Content visible behind tab bar
- Adapts to theme (dark/light blur)
- Fallback color for devices without blur support

#### Tab Bar Colors
```typescript
tabBarActiveTintColor: colors.primary,
tabBarInactiveTintColor: colors.textSecondary,
```

**Effect**:
- Active tab: Primary color (blue)
- Inactive tabs: Secondary text color (gray)
- Applies to both icon and label

#### Tab Bar Label/Icon Spacing
```typescript
tabBarLabelStyle: {
  fontSize: 12,
  fontWeight: '500',
  marginBottom: Platform.OS === 'ios' ? 0 : 8,
},
tabBarIconStyle: {
  marginTop: Platform.OS === 'ios' ? 0 : 8,
}
```

**Why Platform-Specific?**:
- iOS: Safe area automatically adds bottom padding
- Android: Manual margin for proper spacing

### 3.4 Tab Screens

#### Home Tab
```typescript
<Tab.Screen
  name="Home"
  component={HomeScreen}
  options={{
    title: '홈',
    tabBarIcon: ({ color, size }) => <HomeIcon size={size} color={color} />,
  }}
/>
```

**Screen**: Welcome message, user info display

#### Restaurant Tab (Stack Navigator)
```typescript
<Tab.Screen
  name="Restaurant"
  component={RestaurantStackNavigator}
  options={{
    title: '맛집',
    headerShown: false, // Stack has its own header
    tabBarIcon: ({ color, size }) => <RestaurantIcon size={size} color={color} />,
  }}
/>
```

**Important**: `headerShown: false` because Stack Navigator manages its own header

#### Settings Tab
```typescript
<Tab.Screen
  name="Settings"
  component={SettingsScreen}
  options={{
    title: '설정',
    tabBarIcon: ({ color, size }) => <SettingsIcon size={size} color={color} />,
  }}
/>
```

**Screen**: Theme toggle, user profile, logout

---

## 4. Restaurant Stack Navigator

### 4.1 File Location

**Location**: `apps/mobile/src/navigation/RestaurantStackNavigator.tsx`

### 4.2 Implementation

```typescript
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
          headerShown: false, // Hide header (Tab Navigator shows it)
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
```

### 4.3 Stack Screen Options

#### RestaurantList Screen
```typescript
<Stack.Screen
  name="RestaurantList"
  component={RestaurantListScreen}
  options={{
    title: '맛집',
    headerShown: false, // Tab bar shows header
  }}
/>
```

**Why `headerShown: false`?**:
- Tab Navigator already shows header for Restaurant tab
- Avoids double header (Tab header + Stack header)

#### RestaurantDetail Screen
```typescript
<Stack.Screen
  name="RestaurantDetail"
  component={RestaurantDetailScreen}
  options={({ route }) => ({
    title: route.params?.restaurant?.name || '레스토랑',
    headerShown: true,
    headerBackTitle: '뒤로',
  })}
/>
```

**Dynamic Title**: Uses restaurant name from route params

**Back Button**: Shows "뒤로" (Back) label

### 4.4 Navigation Flow

```
RestaurantList
  ↓ (tap restaurant card)
RestaurantDetail
  ↓ (tap back button)
RestaurantList
```

**Transition**: Native slide animation (iOS right-to-left, Android bottom-to-top)

---

## 5. Navigation Types

### 5.1 File Location

**Location**: `apps/mobile/src/navigation/types.ts`

### 5.2 Type Definitions

```typescript
import type { RestaurantData } from 'shared/services';

export type RootTabParamList = {
  Home: undefined;
  Restaurant: undefined; // Stack Navigator (no params)
  Settings: undefined;
};

export type RestaurantStackParamList = {
  RestaurantList: undefined;
  RestaurantDetail: {
    restaurantId: number;
    restaurant: RestaurantData;
  };
};
```

### 5.3 Type Usage

#### Navigate to Restaurant Detail
```typescript
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RestaurantStackParamList } from '../navigation/types';

type RestaurantListNavigationProp = NativeStackNavigationProp<
  RestaurantStackParamList,
  'RestaurantList'
>;

const RestaurantListScreen = () => {
  const navigation = useNavigation<RestaurantListNavigationProp>();

  const handleRestaurantPress = (restaurant: RestaurantData) => {
    navigation.navigate('RestaurantDetail', {
      restaurantId: restaurant.id,
      restaurant: restaurant,
    });
  };

  return (
    <TouchableOpacity onPress={() => handleRestaurantPress(restaurant)}>
      {/* Restaurant card */}
    </TouchableOpacity>
  );
};
```

#### Access Route Params
```typescript
import { useRoute, RouteProp } from '@react-navigation/native';
import type { RestaurantStackParamList } from '../navigation/types';

type RestaurantDetailRouteProp = RouteProp<RestaurantStackParamList, 'RestaurantDetail'>;

const RestaurantDetailScreen = () => {
  const route = useRoute<RestaurantDetailRouteProp>();
  const { restaurantId, restaurant } = route.params;

  return (
    <View>
      <Text>{restaurant.name}</Text>
    </View>
  );
};
```

---

## 6. Theme Integration

### 6.1 Dynamic Header Colors

```typescript
const { theme } = useTheme();
const colors = THEME_COLORS[theme];

screenOptions={{
  headerStyle: {
    backgroundColor: colors.headerBackground,
  },
  headerTintColor: colors.headerText,
  headerTitleStyle: {
    fontWeight: '600',
    color: colors.headerText,
  },
}}
```

**Effect**: Header adapts to light/dark theme automatically

### 6.2 Dynamic Tab Bar Colors

```typescript
tabBarActiveTintColor: colors.primary,
tabBarInactiveTintColor: colors.textSecondary,
```

**Effect**: Tab icons and labels change color based on theme

### 6.3 Blur Type

```typescript
blurType={theme === 'dark' ? 'dark' : 'light'}
```

**Effect**: Blur effect matches theme (dark blur for dark theme, light blur for light theme)

### 6.4 Theme Colors Used

**From `THEME_COLORS` constant**:
```typescript
colors.headerBackground  // Header background
colors.headerText        // Header title and back button
colors.primary           // Active tab color
colors.textSecondary     // Inactive tab color
```

---

## 7. Tab Bar Customization

### 7.1 Tab Bar Icons

**Location**: `apps/mobile/src/components/TabBarIcons.tsx`

```typescript
import React from 'react';
import Svg, { Path } from 'react-native-svg';

interface IconProps {
  size: number;
  color: string;
}

export const HomeIcon: React.FC<IconProps> = ({ size, color }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M9 22V12h6v10"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

export const RestaurantIcon: React.FC<IconProps> = ({ size, color }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 002-2V2M7 2v20M21 15V2v0a2 2 0 00-2 2v9"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M19 22v-7"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

export const SettingsIcon: React.FC<IconProps> = ({ size, color }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    {/* Settings gear icon paths */}
  </Svg>
);
```

**Icon System**:
- Custom SVG icons using `react-native-svg`
- Dynamic color from tab state (active/inactive)
- Size prop for consistent sizing
- Stroke-based (not filled) for clean look

### 7.2 Tab Bar Animation

**Default**: React Navigation provides smooth tab switch animations

**Customization** (future):
```typescript
tabBarOptions={{
  tabBarActiveTintColor: colors.primary,
  tabBarInactiveTintColor: colors.textSecondary,
  tabBarStyle: {
    // Custom animation via Reanimated (optional)
  }
}}
```

---

## 8. Screen Options

### 8.1 Global Screen Options

**Applied to all screens**:
```typescript
screenOptions={{
  headerShown: true,
  headerStyle: { backgroundColor: colors.headerBackground },
  headerTintColor: colors.headerText,
  headerTitleStyle: { fontWeight: '600', color: colors.headerText },
  headerShadowVisible: false,
}}
```

### 8.2 Per-Screen Options

#### Static Options
```typescript
<Tab.Screen
  name="Home"
  component={HomeScreen}
  options={{
    title: '홈',
    tabBarIcon: ({ color, size }) => <HomeIcon size={size} color={color} />,
  }}
/>
```

#### Dynamic Options (Function)
```typescript
<Stack.Screen
  name="RestaurantDetail"
  component={RestaurantDetailScreen}
  options={({ route, navigation }) => ({
    title: route.params?.restaurant?.name || '레스토랑',
    headerShown: true,
    headerBackTitle: '뒤로',
    headerRight: () => (
      <TouchableOpacity onPress={() => navigation.goBack()}>
        <Text>Close</Text>
      </TouchableOpacity>
    ),
  })}
/>
```

**When to Use Function?**:
- Access route params for dynamic title
- Access navigation for custom header buttons
- Access theme for dynamic styling

---

## 9. Navigation Patterns

### 9.1 Navigate Between Tabs

```typescript
import { useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { RootTabParamList } from '../navigation/types';

type NavigationProp = BottomTabNavigationProp<RootTabParamList>;

const SomeScreen = () => {
  const navigation = useNavigation<NavigationProp>();

  const goToSettings = () => {
    navigation.navigate('Settings');
  };

  return <Button title="Go to Settings" onPress={goToSettings} />;
};
```

### 9.2 Navigate Within Stack

```typescript
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RestaurantStackParamList } from '../navigation/types';

type NavigationProp = NativeStackNavigationProp<RestaurantStackParamList, 'RestaurantList'>;

const RestaurantListScreen = () => {
  const navigation = useNavigation<NavigationProp>();

  const openDetail = (restaurant: RestaurantData) => {
    navigation.navigate('RestaurantDetail', {
      restaurantId: restaurant.id,
      restaurant: restaurant,
    });
  };

  return (
    <TouchableOpacity onPress={() => openDetail(restaurant)}>
      {/* Restaurant card */}
    </TouchableOpacity>
  );
};
```

### 9.3 Go Back

```typescript
const navigation = useNavigation();

const handleBack = () => {
  navigation.goBack();
};
```

**Alternative**: Hardware back button (Android) automatically calls `goBack()`

### 9.4 Reset Navigation State

```typescript
import { CommonActions } from '@react-navigation/native';

const resetToHome = () => {
  navigation.dispatch(
    CommonActions.reset({
      index: 0,
      routes: [{ name: 'Home' }],
    })
  );
};
```

**Use Case**: Logout (clear navigation history)

---

## 10. Related Documentation

### Mobile Documentation
- **[MOBILE-SETUP.md](./MOBILE-SETUP.md)**: Metro bundler and TypeScript configuration
- **[MOBILE-HOME.md](./MOBILE-HOME.md)**: Home screen implementation
- **[MOBILE-LOGIN.md](./MOBILE-LOGIN.md)**: Login screen (outside navigation)
- **[MOBILE-RESTAURANT-LIST.md](./MOBILE-RESTAURANT-LIST.md)**: Restaurant list screen
- **[MOBILE-RESTAURANT-DETAIL.md](./MOBILE-RESTAURANT-DETAIL.md)**: Restaurant detail screen
- **[MOBILE-SETTINGS.md](./MOBILE-SETTINGS.md)**: Settings screen

### Shared Documentation
- **[SHARED-CONTEXTS.md](../03-shared/SHARED-CONTEXTS.md)**: ThemeContext usage
- **[SHARED-HOOKS.md](../03-shared/SHARED-HOOKS.md)**: useAuth hook
- **[SHARED-CONSTANTS.md](../03-shared/SHARED-CONSTANTS.md)**: THEME_COLORS

### Core Documentation
- **[ARCHITECTURE.md](../00-core/ARCHITECTURE.md)**: Overall architecture
- **[DEVELOPMENT.md](../00-core/DEVELOPMENT.md)**: Development workflow

---

## Appendix: React Navigation Resources

### Official Documentation
- **React Navigation**: https://reactnavigation.org/docs/getting-started
- **Bottom Tabs**: https://reactnavigation.org/docs/bottom-tab-navigator
- **Native Stack**: https://reactnavigation.org/docs/native-stack-navigator
- **TypeScript**: https://reactnavigation.org/docs/typescript

### Key Packages
```json
{
  "@react-navigation/native": "^7.1.18",
  "@react-navigation/native-stack": "^7.3.27",
  "@react-navigation/bottom-tabs": "^7.4.8",
  "react-native-safe-area-context": "^2.2.0",
  "react-native-screens": "^3.0.0",
  "@react-native-community/blur": "^4.4.1"
}
```

---

**Document Version**: 1.0.0
**Covers Files**: `App.tsx`, `BottomTabNavigator.tsx`, `RestaurantStackNavigator.tsx`, `types.ts`, `TabBarIcons.tsx`
