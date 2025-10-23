# WEB-HOME.md

> **Last Updated**: 2025-10-23 21:35
> **Purpose**: Home screen implementation and user welcome interface

---

## Table of Contents

1. [Overview](#1-overview)
2. [Component Structure](#2-component-structure)
3. [Implementation](#3-implementation)
4. [User Information Display](#4-user-information-display)
5. [Theme Integration](#5-theme-integration)
6. [Navigation Integration](#6-navigation-integration)
7. [Best Practices](#7-best-practices)
8. [Related Documentation](#8-related-documentation)

---

## 1. Overview

The Home component is the main landing page after user login. It displays a welcome message with user information and serves as the entry point to the application.

### Key Features
- **Welcome Message**: Personalized greeting for logged-in users
- **User Info Card**: Displays email and username
- **Theme Support**: Adapts to light/dark theme
- **Header & Drawer**: Integrated navigation components
- **Simple Layout**: Centered card with user information

### Component Hierarchy
```
Home
├── Header (with hamburger menu and theme toggle)
├── Content Area
│   ├── Welcome Section (card)
│   │   ├── Title: "환영합니다!"
│   │   ├── Subtitle: "로그인에 성공했습니다."
│   │   └── User Info (email, username)
│   └── Placeholder Text
└── Drawer (slide-out sidebar)
```

---

## 2. Component Structure

### 2.1 File Location

**Location**: `apps/web/src/components/Home.tsx`

### 2.2 Component API

```typescript
interface HomeProps {
  onLogout: () => Promise<void>;  // Logout callback from parent
}

const Home: React.FC<HomeProps> = ({ onLogout }) => {
  // Implementation
}
```

**Props**:
- `onLogout`: Async callback to handle logout action

---

## 3. Implementation

### 3.1 Full Component Code

```typescript
import React, { useState } from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { useAuth } from '@shared/hooks'
import { useTheme } from '@shared/contexts'
import { THEME_COLORS } from '@shared/constants'
import Header from './Header'
import Drawer from './Drawer'

interface HomeProps {
  onLogout: () => Promise<void>
}

const Home: React.FC<HomeProps> = ({ onLogout }) => {
  const { user } = useAuth()
  const { theme } = useTheme()
  const [drawerVisible, setDrawerVisible] = useState(false)

  const colors = THEME_COLORS[theme]

  const handleLogout = async () => {
    await onLogout()
    window.location.href = '/login'
  }

  return (
    <div className="page-container" style={{ backgroundColor: colors.background }}>
      <Header onMenuPress={() => setDrawerVisible(true)} />

      <View style={styles.content}>
        <View style={[styles.welcomeSection, {
          backgroundColor: colors.surface,
          borderColor: colors.border
        }]}>
          <Text style={[styles.title, { color: colors.text }]}>환영합니다!</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            로그인에 성공했습니다.
          </Text>
          {user && (
            <View style={[styles.userInfo, {
              backgroundColor: colors.background,
              borderColor: colors.border
            }]}>
              <Text style={[styles.userInfoText, { color: colors.text }]}>
                이메일: {user.email}
              </Text>
              <Text style={[styles.userInfoText, { color: colors.text }]}>
                사용자명: {user.username}
              </Text>
            </View>
          )}
        </View>

        <Text style={[styles.placeholderText, { color: colors.textSecondary }]}>
          홈 화면 콘텐츠가 여기에 표시됩니다.
        </Text>
      </View>

      <Drawer
        visible={drawerVisible}
        onClose={() => setDrawerVisible(false)}
        onLogout={handleLogout}
      />
    </div>
  )
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    padding: 24,
  },
  welcomeSection: {
    padding: 32,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 32,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 16,
  },
  userInfo: {
    marginTop: 16,
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    width: '100%',
    maxWidth: 400,
  },
  userInfoText: {
    fontSize: 14,
    marginBottom: 4,
  },
  placeholderText: {
    fontSize: 16,
    textAlign: 'center',
  },
})

export default Home
```

### 3.2 State Management

```typescript
const { user } = useAuth()                        // Get logged-in user
const { theme } = useTheme()                      // Get current theme
const [drawerVisible, setDrawerVisible] = useState(false)  // Drawer state
const colors = THEME_COLORS[theme]                // Get theme colors
```

**State Variables**:
- `user`: Current user object from useAuth hook
- `theme`: Current theme ('light' | 'dark')
- `drawerVisible`: Boolean to control drawer visibility
- `colors`: Theme-specific color palette

### 3.3 Layout Structure

**Container**: `.page-container` div with theme-aware background

**Content Area**:
```typescript
<View style={styles.content}>
  {/* Welcome Section (card) */}
  {/* Placeholder Text */}
</View>
```

**Padding**: 24px all around for breathing room

---

## 4. User Information Display

### 4.1 Welcome Section Card

**Structure**:
```typescript
<View style={[styles.welcomeSection, {
  backgroundColor: colors.surface,
  borderColor: colors.border
}]}>
  {/* Title */}
  {/* Subtitle */}
  {/* User Info (conditional) */}
</View>
```

**Styling**:
- **Padding**: 32px (spacious)
- **Border**: 1px with theme border color
- **Border Radius**: 12px (rounded corners)
- **Margin Bottom**: 32px (separation from placeholder)
- **Alignment**: Centered content

**Visual Representation** (Light Mode):
```
┌──────────────────────────────┐
│                              │
│       환영합니다!             │ ← Title (28px, bold)
│   로그인에 성공했습니다.       │ ← Subtitle (16px)
│                              │
│  ┌────────────────────────┐  │
│  │ 이메일: user@email.com │  │
│  │ 사용자명: username     │  │ ← User Info Card
│  └────────────────────────┘  │
│                              │
└──────────────────────────────┘
```

### 4.2 Title and Subtitle

```typescript
<Text style={[styles.title, { color: colors.text }]}>환영합니다!</Text>
<Text style={[styles.subtitle, { color: colors.textSecondary }]}>
  로그인에 성공했습니다.
</Text>
```

**Title**:
- Text: "환영합니다!" (Welcome!)
- Size: 28px
- Weight: Bold
- Color: Primary text color
- Margin Bottom: 8px

**Subtitle**:
- Text: "로그인에 성공했습니다." (Login successful)
- Size: 16px
- Color: Secondary text color (gray)
- Margin Bottom: 16px

### 4.3 User Info Card

```typescript
{user && (
  <View style={[styles.userInfo, {
    backgroundColor: colors.background,
    borderColor: colors.border
  }]}>
    <Text style={[styles.userInfoText, { color: colors.text }]}>
      이메일: {user.email}
    </Text>
    <Text style={[styles.userInfoText, { color: colors.text }]}>
      사용자명: {user.username}
    </Text>
  </View>
)}
```

**Conditional Rendering**: Only shown when `user` exists

**Styling**:
- **Margin Top**: 16px (separation from subtitle)
- **Padding**: 16px
- **Border**: 1px with theme border color
- **Border Radius**: 8px
- **Max Width**: 400px (prevents excessive stretching)
- **Width**: 100% (responsive within max width)

**Content**:
- Email address from `user.email`
- Username from `user.username`

**Example**:
```
이메일: niney@ks.com
사용자명: niney
```

---

## 5. Theme Integration

### 5.1 Theme Colors Used

```typescript
const colors = THEME_COLORS[theme]

// Applied colors
background: colors.background        // Page background (#FFFFFF / #000000)
surface: colors.surface             // Card background (#F5F5F5 / #1C1C1E)
border: colors.border               // Card border (#E0E0E0 / #38383A)
text: colors.text                   // Primary text (#000000 / #FFFFFF)
textSecondary: colors.textSecondary // Secondary text (#666666 / #ABABAB)
```

### 5.2 Light Mode Appearance

```
Background: White (#FFFFFF)
Card: Light gray (#F5F5F5)
Border: Light gray (#E0E0E0)
Title: Black (#000000)
Subtitle: Dark gray (#666666)
```

### 5.3 Dark Mode Appearance

```
Background: True black (#000000)
Card: Dark gray (#1C1C1E)
Border: Dark gray (#38383A)
Title: White (#FFFFFF)
Subtitle: Light gray (#ABABAB)
```

### 5.4 Theme Toggle

**User Action**: Click theme icon in Header (🌙/☀️)

**Result**:
1. Theme changes (light ↔ dark)
2. Home component re-renders with new colors
3. All color values update instantly
4. No flicker or delay

---

## 6. Navigation Integration

### 6.1 Header Integration

```typescript
<Header onMenuPress={() => setDrawerVisible(true)} />
```

**Behavior**:
- Header displays hamburger menu, title, theme toggle, profile
- Clicking hamburger or profile opens drawer
- Theme toggle changes theme globally

### 6.2 Drawer Integration

```typescript
<Drawer
  visible={drawerVisible}
  onClose={() => setDrawerVisible(false)}
  onLogout={handleLogout}
/>
```

**Behavior**:
- Drawer slides in when `drawerVisible` is true
- User can navigate to other pages
- Logout button triggers `handleLogout`

### 6.3 Logout Flow

```typescript
const handleLogout = async () => {
  await onLogout()                // Clear auth state and storage
  window.location.href = '/login' // Force reload to login page
}
```

**Steps**:
1. User clicks logout in drawer
2. `handleLogout` called
3. `onLogout` prop callback executed (clears storage)
4. Hard redirect to `/login` (clears all state)

**Why Hard Redirect?**
- Ensures all state is cleared
- Prevents back button from accessing protected routes
- Forces fresh login page load

---

## 7. Best Practices

### 7.1 Always Use Theme Colors

**❌ Bad** (hardcoded):
```typescript
<View style={{ backgroundColor: '#FFFFFF' }}>
```

**✅ Good** (theme colors):
```typescript
<View style={{ backgroundColor: colors.background }}>
```

### 7.2 Conditional User Display

**❌ Bad** (assumes user exists):
```typescript
<Text>{user.email}</Text>  // Runtime error if user is null
```

**✅ Good** (conditional rendering):
```typescript
{user && (
  <Text>{user.email}</Text>
)}
```

### 7.3 Logout with Hard Redirect

**❌ Bad** (state may linger):
```typescript
const handleLogout = async () => {
  await onLogout()
  navigate('/login')  // Soft navigation
}
```

**✅ Good** (clean state):
```typescript
const handleLogout = async () => {
  await onLogout()
  window.location.href = '/login'  // Hard redirect
}
```

### 7.4 Close Drawer Before Logout

**Pattern**: Always close drawer before navigation/logout

```typescript
const handleLogout = async () => {
  // Drawer closes automatically via onLogout callback in Drawer component
  await onLogout()
  window.location.href = '/login'
}
```

---

## 8. Related Documentation

### Web Documentation
- **[WEB-HEADER-DRAWER.md](./WEB-HEADER-DRAWER.md)**: Header and Drawer components
- **[WEB-THEME.md](./WEB-THEME.md)**: Theme system and color palette
- **[WEB-LAYOUT.md](./WEB-LAYOUT.md)**: Page layout patterns
- **[WEB-ROUTING.md](./WEB-ROUTING.md)**: Navigation and routing
- **[WEB-LOGIN.md](./WEB-LOGIN.md)**: Login screen (pre-Home flow)

### Shared Documentation
- **[SHARED-HOOKS.md](../03-shared/SHARED-HOOKS.md)**: useAuth hook (user state)
- **[SHARED-CONTEXTS.md](../03-shared/SHARED-CONTEXTS.md)**: ThemeContext usage

### Core Documentation
- **[ARCHITECTURE.md](../00-core/ARCHITECTURE.md)**: Overall architecture
- **[DEVELOPMENT.md](../00-core/DEVELOPMENT.md)**: Development workflow

---

## Appendix: Future Enhancements

### Potential Features
1. **Dashboard Cards**: Quick stats, recent activity, shortcuts
2. **Notifications**: Unread messages, alerts
3. **Quick Actions**: Frequently used features
4. **Personalization**: Customizable home widgets
5. **Search**: Global search from home screen

### Example Dashboard Layout
```
┌──────────────────────────────┐
│       환영합니다, User!       │
├──────────────────────────────┤
│  ┌─────────┐  ┌─────────┐   │
│  │ Recent  │  │ Favorites│   │
│  │ 5 items │  │ 3 items │   │
│  └─────────┘  └─────────┘   │
│  ┌─────────┐  ┌─────────┐   │
│  │ Stats   │  │ Quick   │   │
│  │ Graph   │  │ Actions │   │
│  └─────────┘  └─────────┘   │
└──────────────────────────────┘
```

---

**Document Version**: 1.0.0
**Covers Files**: `Home.tsx`, home screen patterns
