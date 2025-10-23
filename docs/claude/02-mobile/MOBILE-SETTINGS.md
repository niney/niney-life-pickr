# MOBILE-SETTINGS.md

> **Last Updated**: 2025-10-23 22:25
> **Purpose**: Mobile Settings screen with glassmorphism design and theme toggle

---

## Table of Contents

1. [Overview](#1-overview)
2. [Component Structure](#2-component-structure)
3. [Implementation](#3-implementation)
4. [User Info Section](#4-user-info-section)
5. [Theme Settings](#5-theme-settings)
6. [Logout Button](#6-logout-button)
7. [Glassmorphism Design](#7-glassmorphism-design)
8. [Related Documentation](#8-related-documentation)

---

## 1. Overview

The Settings screen provides user information display, theme toggle, and logout functionality with a modern glassmorphism design matching the Home screen aesthetic.

### Key Features
- **User Info Display**: Email and username from auth state
- **Theme Toggle**: Switch between light/dark mode
- **Logout Button**: Sign out with distinctive red styling
- **Glassmorphism Cards**: Frosted glass effect using BlurView
- **Theme Integration**: Full color adaptation

### Component Layout
```
SettingsScreen
└── ScrollView
    └── Content Container
        ├── User Info Card (glassmorphism)
        │   ├── Section Title: "사용자 정보"
        │   ├── Email Row
        │   └── Username Row
        ├── Theme Settings Card (glassmorphism)
        │   ├── Section Title: "테마 설정"
        │   └── Dark Mode Toggle Row
        └── Logout Button (glassmorphism)
            └── "로그아웃" (red text)
```

---

## 2. Component Structure

### 2.1 File Location

**Location**: `apps/mobile/src/screens/SettingsScreen.tsx`

**File Size**: 168 lines

### 2.2 Dependencies

```typescript
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { BlurView } from '@react-native-community/blur';
import { useTheme } from 'shared/contexts';
import { useAuth } from 'shared/hooks';
import { THEME_COLORS } from 'shared/constants';
```

**Key Dependencies**:
- **BlurView**: Glassmorphism background effect
- **useTheme**: Theme state and toggle function
- **useAuth**: User info and logout function
- **THEME_COLORS**: Color palette

---

## 3. Implementation

### 3.1 State Management

```typescript
const SettingsScreen: React.FC = () => {
  const { theme, toggleTheme } = useTheme();
  const { user, logout } = useAuth();
  const colors = THEME_COLORS[theme];

  const handleLogout = async () => {
    await logout();
  };

  return (
    // JSX
  );
};
```

**State Sources**:
- `theme`: Current theme ('light' or 'dark')
- `toggleTheme`: Function to switch theme
- `user`: Logged-in user object (email, username)
- `logout`: Function to sign out
- `colors`: Theme-specific color palette

### 3.2 Full Component Structure

```typescript
<ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
  <View style={styles.content}>
    {/* User Info Card */}
    <View style={styles.cardContainer}>
      <BlurView {...blurProps} />
      <View style={styles.cardContent}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>사용자 정보</Text>
        {user && (
          <>
            <View style={styles.infoRow}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>이메일</Text>
              <Text style={[styles.value, { color: colors.text }]}>{user.email}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>사용자명</Text>
              <Text style={[styles.value, { color: colors.text }]}>{user.username}</Text>
            </View>
          </>
        )}
      </View>
    </View>

    {/* Theme Settings Card */}
    <View style={styles.cardContainer}>
      <BlurView {...blurProps} />
      <View style={styles.cardContent}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>테마 설정</Text>
        <TouchableOpacity style={styles.settingRow} onPress={toggleTheme}>
          <Text style={[styles.settingLabel, { color: colors.text }]}>다크 모드</Text>
          <Text style={[styles.settingValue, { color: colors.primary }]}>
            {theme === 'dark' ? '켜짐' : '꺼짐'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>

    {/* Logout Button */}
    <TouchableOpacity
      style={styles.logoutButtonContainer}
      onPress={handleLogout}
    >
      <BlurView {...blurProps} />
      <View style={styles.logoutButtonContent}>
        <Text style={styles.logoutText}>로그아웃</Text>
      </View>
    </TouchableOpacity>
  </View>
</ScrollView>
```

---

## 4. User Info Section

### 4.1 User Info Card

```typescript
<View style={styles.cardContainer}>
  <BlurView
    style={styles.blurContainer}
    blurType={theme === 'dark' ? 'dark' : 'light'}
    blurAmount={20}
    reducedTransparencyFallbackColor={
      theme === 'dark' ? 'rgba(26, 26, 26, 0.7)' : 'rgba(255, 255, 255, 0.7)'
    }
  />
  <View style={styles.cardContent}>
    <Text style={[styles.sectionTitle, { color: colors.text }]}>
      사용자 정보
    </Text>
    {user && (
      <>
        <View style={styles.infoRow}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>
            이메일
          </Text>
          <Text style={[styles.value, { color: colors.text }]}>
            {user.email}
          </Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>
            사용자명
          </Text>
          <Text style={[styles.value, { color: colors.text }]}>
            {user.username}
          </Text>
        </View>
      </>
    )}
  </View>
</View>
```

**Content**: Email and username in label-value rows

**Conditional Rendering**: Only shows if `user` exists

### 4.2 Info Row Layout

```typescript
infoRow: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  paddingVertical: 8,
},
label: {
  fontSize: 14,
},
value: {
  fontSize: 14,
  fontWeight: '500',
},
```

**Layout**: Horizontal row with label on left, value on right

**Styling**:
- Label: Secondary color (gray)
- Value: Primary text color, medium weight

---

## 5. Theme Settings

### 5.1 Theme Settings Card

```typescript
<View style={styles.cardContainer}>
  <BlurView {...blurProps} />
  <View style={styles.cardContent}>
    <Text style={[styles.sectionTitle, { color: colors.text }]}>
      테마 설정
    </Text>
    <TouchableOpacity style={styles.settingRow} onPress={toggleTheme}>
      <Text style={[styles.settingLabel, { color: colors.text }]}>
        다크 모드
      </Text>
      <Text style={[styles.settingValue, { color: colors.primary }]}>
        {theme === 'dark' ? '켜짐' : '꺼짐'}
      </Text>
    </TouchableOpacity>
  </View>
</View>
```

**Content**: Single setting row for dark mode toggle

### 5.2 Theme Toggle Behavior

```typescript
const { theme, toggleTheme } = useTheme();

<TouchableOpacity onPress={toggleTheme}>
  <Text style={{ color: colors.primary }}>
    {theme === 'dark' ? '켜짐' : '꺼짐'}
  </Text>
</TouchableOpacity>
```

**Flow**:
1. User taps row
2. `toggleTheme()` called (from ThemeContext)
3. Theme switches: light ↔ dark
4. Storage updated automatically
5. UI re-renders with new theme colors

**Status Display**:
- **켜짐** (On): Dark mode active
- **꺼짐** (Off): Light mode active

**Color**: Primary color (blue) for status text

### 5.3 Setting Row Layout

```typescript
settingRow: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'center',
  paddingVertical: 8,
},
settingLabel: {
  fontSize: 15,
},
settingValue: {
  fontSize: 15,
  fontWeight: '500',
},
```

**Layout**: Similar to info row, but with center vertical alignment

---

## 6. Logout Button

### 6.1 Logout Button Card

```typescript
<TouchableOpacity
  style={styles.logoutButtonContainer}
  onPress={handleLogout}
>
  <BlurView
    style={styles.blurContainer}
    blurType={theme === 'dark' ? 'dark' : 'light'}
    blurAmount={20}
    reducedTransparencyFallbackColor={
      theme === 'dark' ? 'rgba(26, 26, 26, 0.7)' : 'rgba(255, 255, 255, 0.7)'
    }
  />
  <View style={styles.logoutButtonContent}>
    <Text style={styles.logoutText}>로그아웃</Text>
  </View>
</TouchableOpacity>
```

**Design**: Glassmorphism card with red styling

### 6.2 Logout Handler

```typescript
const handleLogout = async () => {
  await logout();
};
```

**Flow** (from `useAuth` hook):
1. Call `logout()`
2. Clear AsyncStorage (token, user data)
3. Update `isAuthenticated` state to `false`
4. App.tsx re-renders
5. NavigationContainer unmounts
6. LoginScreen appears

**See**: `SHARED-HOOKS.md` for `useAuth` implementation

### 6.3 Logout Button Styling

```typescript
logoutButtonContainer: {
  overflow: 'hidden',
  borderRadius: 16,
  borderWidth: 1,
  borderColor: 'rgba(255, 68, 68, 0.3)',  // Red border
  shadowColor: '#ff4444',  // Red shadow
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.2,
  shadowRadius: 12,
  elevation: 6,
},
logoutButtonContent: {
  padding: 16,
  alignItems: 'center',
},
logoutText: {
  fontSize: 16,
  fontWeight: '600',
  color: '#ff4444',  // Red text (static, not theme-aware)
},
```

**Visual Effect**:
- Red border and shadow (distinctive warning color)
- Red text (always #ff4444, regardless of theme)
- Centered text
- Glassmorphism blur background

**Why Red?**: Indicates destructive action (sign out)

---

## 7. Glassmorphism Design

### 7.1 Card Container

```typescript
cardContainer: {
  overflow: 'hidden',
  borderRadius: 20,
  marginBottom: 16,
  // Glassmorphism effect
  borderWidth: 1,
  borderColor: 'rgba(255, 255, 255, 0.18)',
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 8 },
  shadowOpacity: 0.1,
  shadowRadius: 24,
  elevation: 8,
},
```

**Visual Elements**:
- Rounded corners (20px)
- Semi-transparent border
- Soft shadow
- `overflow: 'hidden'` clips BlurView to border radius

### 7.2 Blur Container

```typescript
blurContainer: {
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
},
```

**Position**: Absolute fill to cover entire card

**Layer Order**:
1. Card container (border, shadow)
2. BlurView (background blur)
3. Card content (foreground text)

### 7.3 BlurView Configuration

```typescript
<BlurView
  style={styles.blurContainer}
  blurType={theme === 'dark' ? 'dark' : 'light'}
  blurAmount={20}
  reducedTransparencyFallbackColor={
    theme === 'dark' ? 'rgba(26, 26, 26, 0.7)' : 'rgba(255, 255, 255, 0.7)'
  }
/>
```

**Props**:
- `blurType`: 'dark' for dark theme, 'light' for light theme
- `blurAmount`: 20 (subtle blur)
- `reducedTransparencyFallbackColor`: Fallback for devices without blur support

**Consistency**: Same blur configuration as HomeScreen

### 7.4 Card Content

```typescript
cardContent: {
  padding: 16,
},
```

**Purpose**: Padding for foreground content (on top of blur)

---

## 8. Related Documentation

### Mobile Documentation
- **[MOBILE-HOME.md](./MOBILE-HOME.md)**: Home screen (similar glassmorphism design)
- **[MOBILE-NAVIGATION.md](./MOBILE-NAVIGATION.md)**: Bottom Tab Navigator (Settings tab)
- **[MOBILE-LOGIN.md](./MOBILE-LOGIN.md)**: Login screen (logout redirects here)

### Shared Documentation
- **[SHARED-CONTEXTS.md](../03-shared/SHARED-CONTEXTS.md)**: ThemeContext (toggleTheme)
- **[SHARED-HOOKS.md](../03-shared/SHARED-HOOKS.md)**: useAuth hook (user, logout)
- **[SHARED-CONSTANTS.md](../03-shared/SHARED-CONSTANTS.md)**: THEME_COLORS

### Web Comparison
- **[WEB-HEADER-DRAWER.md](../01-web/WEB-HEADER-DRAWER.md)**: Web settings in drawer (different approach)

### Core Documentation
- **[ARCHITECTURE.md](../00-core/ARCHITECTURE.md)**: Overall architecture
- **[DEVELOPMENT.md](../00-core/DEVELOPMENT.md)**: Development workflow

---

## Appendix: Future Enhancements

### Planned Features

1. **Additional Settings**:
   - Language selection (i18n)
   - Notification preferences
   - Privacy settings
   - About app section

2. **Profile Management**:
   - Edit username
   - Change password
   - Profile picture upload

3. **App Information**:
   - Version number
   - Build number
   - Terms of service
   - Privacy policy

4. **Advanced Theme Options**:
   - Auto theme (follow system)
   - Custom accent colors
   - Font size adjustment

5. **Data Management**:
   - Clear cache
   - Export data
   - Delete account

---

## Appendix: BlurView Props

### Blur Types
- `'light'`: Light blur (for light backgrounds)
- `'dark'`: Dark blur (for dark backgrounds)
- `'extraDark'`: Very dark blur
- `'regular'`: Standard iOS blur
- `'prominent'`: Strong blur

### Blur Amount
- Range: 0-100
- Recommended: 10-30 for glassmorphism
- Current: 20 (subtle effect)

### Fallback Color
- Used when device doesn't support blur
- Format: `rgba(r, g, b, alpha)`
- Current: Semi-transparent black/white (70% opacity)

---

## Appendix: Glassmorphism Best Practices

### Visual Hierarchy
1. **Card Container**: Border, shadow, border radius
2. **BlurView**: Background blur layer
3. **Content**: Foreground text and buttons

### Color Guidelines
- **Border**: Semi-transparent white (18% opacity)
- **Shadow**: Soft black shadow (10% opacity, large radius)
- **Fallback**: 70% opacity solid color

### Layout Tips
- Use `overflow: 'hidden'` to clip blur to border radius
- Position BlurView absolutely within container
- Add padding to content layer for proper spacing

---

**Document Version**: 1.0.0
**Covers Files**: `SettingsScreen.tsx`, glassmorphism patterns, theme toggle
