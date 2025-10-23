# MOBILE-HOME.md

> **Last Updated**: 2025-10-23 22:05
> **Purpose**: Mobile Home screen with glassmorphism design

---

## Table of Contents

1. [Overview](#1-overview)
2. [Component Structure](#2-component-structure)
3. [Implementation](#3-implementation)
4. [Glassmorphism Design](#4-glassmorphism-design)
5. [Welcome Card](#5-welcome-card)
6. [Stats Card](#6-stats-card)
7. [Theme Integration](#7-theme-integration)
8. [Styling Details](#8-styling-details)
9. [Related Documentation](#9-related-documentation)

---

## 1. Overview

The Home screen is the landing page after login, featuring a modern glassmorphism design with blurred card backgrounds. It displays a welcome message with the user's name and placeholder statistics.

### Key Features
- **Glassmorphism Design**: Frosted glass effect with BlurView
- **Theme Support**: Adapts blur type and colors to light/dark theme
- **User Greeting**: Personalized welcome message with username
- **Stats Display**: Placeholder statistics for future features
- **Scrollable Content**: ScrollView for future expansion
- **Tab Bar Spacing**: Bottom padding to avoid tab bar overlap

### Component Layout
```
HomeScreen
└── ScrollView (theme background)
    └── Content Container
        ├── Welcome Card (glassmorphism)
        │   ├── BlurView (background)
        │   └── Card Content
        │       ├── Title: "환영합니다! 👋"
        │       └── Subtitle: "{username}님"
        └── Stats Card (glassmorphism)
            ├── BlurView (background)
            └── Card Content
                ├── Title: "통계"
                └── Stats Row
                    ├── Stat: 저장한 맛집 (0)
                    └── Stat: 방문 완료 (0)
```

---

## 2. Component Structure

### 2.1 File Location

**Location**: `apps/mobile/src/screens/HomeScreen.tsx`

### 2.2 Dependencies

```typescript
import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { BlurView } from '@react-native-community/blur';
import { useTheme } from 'shared/contexts';
import { useAuth } from 'shared/hooks';
import { THEME_COLORS } from 'shared/constants';
```

**Key Dependencies**:
- **BlurView**: `@react-native-community/blur` for glassmorphism effect
- **useTheme**: Access current theme (light/dark)
- **useAuth**: Access logged-in user info
- **THEME_COLORS**: Theme-aware color palette

---

## 3. Implementation

### 3.1 Full Component

```typescript
const HomeScreen: React.FC = () => {
  const { theme } = useTheme();
  const { user } = useAuth();
  const colors = THEME_COLORS[theme];

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.content}>
        {/* Welcome Card */}
        <View style={[styles.cardContainer, styles.welcomeCard]}>
          <BlurView
            style={styles.blurContainer}
            blurType={theme === 'dark' ? 'dark' : 'light'}
            blurAmount={20}
            reducedTransparencyFallbackColor={
              theme === 'dark' ? 'rgba(26, 26, 26, 0.7)' : 'rgba(255, 255, 255, 0.7)'
            }
          />
          <View style={styles.cardContent}>
            <Text style={[styles.title, { color: colors.text }]}>환영합니다! 👋</Text>
            {user && (
              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                {user.username}님
              </Text>
            )}
          </View>
        </View>

        {/* Stats Card */}
        <View style={[styles.cardContainer, styles.statsCard]}>
          <BlurView
            style={styles.blurContainer}
            blurType={theme === 'dark' ? 'dark' : 'light'}
            blurAmount={20}
            reducedTransparencyFallbackColor={
              theme === 'dark' ? 'rgba(26, 26, 26, 0.7)' : 'rgba(255, 255, 255, 0.7)'
            }
          />
          <View style={styles.cardContent}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>통계</Text>
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: colors.primary }]}>0</Text>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                  저장한 맛집
                </Text>
              </View>
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: colors.primary }]}>0</Text>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                  방문 완료
                </Text>
              </View>
            </View>
          </View>
        </View>
      </View>
    </ScrollView>
  );
};
```

### 3.2 Component Breakdown

#### State Management
```typescript
const { theme } = useTheme();
const { user } = useAuth();
const colors = THEME_COLORS[theme];
```

**State Sources**:
- `theme`: Current theme ('light' or 'dark') from ThemeContext
- `user`: Logged-in user object with `username`, `email`, etc.
- `colors`: Theme-specific color palette

#### ScrollView Container
```typescript
<ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
  <View style={styles.content}>
    {/* Cards */}
  </View>
</ScrollView>
```

**Why ScrollView?**:
- Allows content to scroll if screen is small
- Future-proof for adding more cards
- Handles keyboard appearance gracefully

**Content Padding**: `paddingBottom: 100` to avoid tab bar overlap

---

## 4. Glassmorphism Design

### 4.1 What is Glassmorphism?

**Visual Effect**: Frosted glass appearance with:
- Blurred background
- Semi-transparent surface
- Subtle border
- Soft shadow

**iOS Inspiration**: Similar to iOS Control Center cards

### 4.2 Implementation Pattern

**Card Structure**:
```typescript
<View style={styles.cardContainer}>
  <BlurView style={styles.blurContainer} {...blurProps} />
  <View style={styles.cardContent}>
    {/* Card content */}
  </View>
</View>
```

**Layer Hierarchy**:
1. **Card Container**: Outer wrapper with border radius and shadow
2. **BlurView**: Absolute positioned blur layer (background)
3. **Card Content**: Foreground content layer (text, components)

### 4.3 BlurView Configuration

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

**Props Explained**:
- `style`: Absolute positioned to fill card container
- `blurType`: 'dark' for dark theme, 'light' for light theme
- `blurAmount`: Blur intensity (0-100), 20 is subtle
- `reducedTransparencyFallbackColor`: Fallback for devices without blur support

**Theme Adaptation**:
- **Light Mode**: Light blur with white fallback
- **Dark Mode**: Dark blur with dark gray fallback

---

## 5. Welcome Card

### 5.1 Structure

```typescript
<View style={[styles.cardContainer, styles.welcomeCard]}>
  <BlurView {...blurProps} />
  <View style={styles.cardContent}>
    <Text style={[styles.title, { color: colors.text }]}>환영합니다! 👋</Text>
    {user && (
      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
        {user.username}님
      </Text>
    )}
  </View>
</View>
```

### 5.2 Content

#### Welcome Title
```typescript
<Text style={[styles.title, { color: colors.text }]}>환영합니다! 👋</Text>
```

**Styling**:
- Font size: 28px
- Font weight: Bold
- Color: `colors.text` (theme-aware)
- Emoji: 👋 (waving hand)

#### User Subtitle
```typescript
{user && (
  <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
    {user.username}님
  </Text>
)}
```

**Conditional Rendering**: Only shows if `user` exists

**Content**: `{username}님` (e.g., "niney님")

**Styling**:
- Font size: 16px
- Color: `colors.textSecondary` (theme-aware)

### 5.3 Card Dimensions

```typescript
welcomeCard: {
  minHeight: 120,
}
```

**Purpose**: Ensures consistent height even with short usernames

---

## 6. Stats Card

### 6.1 Structure

```typescript
<View style={[styles.cardContainer, styles.statsCard]}>
  <BlurView {...blurProps} />
  <View style={styles.cardContent}>
    <Text style={[styles.cardTitle, { color: colors.text }]}>통계</Text>
    <View style={styles.statsRow}>
      <View style={styles.statItem}>
        <Text style={[styles.statValue, { color: colors.primary }]}>0</Text>
        <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
          저장한 맛집
        </Text>
      </View>
      <View style={styles.statItem}>
        <Text style={[styles.statValue, { color: colors.primary }]}>0</Text>
        <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
          방문 완료
        </Text>
      </View>
    </View>
  </View>
</View>
```

### 6.2 Card Title

```typescript
<Text style={[styles.cardTitle, { color: colors.text }]}>통계</Text>
```

**Styling**:
- Font size: 18px
- Font weight: 600
- Margin bottom: 16px (separation from stats)

### 6.3 Stats Row

```typescript
<View style={styles.statsRow}>
  {/* Stat items */}
</View>
```

**Layout**:
```typescript
statsRow: {
  flexDirection: 'row',
  justifyContent: 'space-around',
}
```

**Effect**: Horizontal row with evenly distributed stat items

### 6.4 Stat Item

```typescript
<View style={styles.statItem}>
  <Text style={[styles.statValue, { color: colors.primary }]}>0</Text>
  <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
    저장한 맛집
  </Text>
</View>
```

**Structure**:
1. **Stat Value**: Large number (32px, bold, primary color)
2. **Stat Label**: Small label (14px, secondary color)

**Alignment**: Centered (both horizontal and vertical)

### 6.5 Current Stats

**Status**: Placeholder (always 0)

**Future Implementation**:
- Fetch real stats from backend
- Display:
  - Total saved restaurants
  - Total visits completed
  - Other metrics (reviews written, favorites, etc.)

### 6.6 Card Dimensions

```typescript
statsCard: {
  minHeight: 160,
}
```

**Purpose**: Taller than welcome card to accommodate stats layout

---

## 7. Theme Integration

### 7.1 Theme Colors Used

```typescript
const colors = THEME_COLORS[theme];
```

**Applied Colors**:
- `colors.background`: ScrollView background
- `colors.text`: Primary text (titles, card titles)
- `colors.textSecondary`: Secondary text (subtitle, stat labels)
- `colors.primary`: Accent color (stat values)

### 7.2 Dynamic Styling

#### Background Color
```typescript
<ScrollView style={{ backgroundColor: colors.background }}>
```

**Effect**: Page background adapts to theme

#### Text Colors
```typescript
<Text style={{ color: colors.text }}>환영합니다!</Text>
<Text style={{ color: colors.textSecondary }}>{user.username}님</Text>
<Text style={{ color: colors.primary }}>0</Text>
```

**Effect**: All text colors adapt to theme

#### Blur Type
```typescript
blurType={theme === 'dark' ? 'dark' : 'light'}
```

**Effect**: Blur appearance matches theme aesthetic

---

## 8. Styling Details

### 8.1 Container Styles

```typescript
container: {
  flex: 1,
},
content: {
  padding: 16,
  paddingBottom: 100, // Tab bar spacing
},
```

**Bottom Padding**: 100px to prevent last card from being hidden by tab bar

### 8.2 Card Container

```typescript
cardContainer: {
  overflow: 'hidden',
  borderRadius: 20,
  marginBottom: 16,
  // Glassmorphism
  borderWidth: 1,
  borderColor: 'rgba(255, 255, 255, 0.18)',
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 8 },
  shadowOpacity: 0.1,
  shadowRadius: 24,
  elevation: 8,
},
```

**Key Properties**:
- `overflow: 'hidden'`: Clips BlurView to border radius
- `borderRadius: 20`: Rounded corners
- `marginBottom: 16`: Spacing between cards
- `borderWidth: 1`: Subtle border for glassmorphism
- `borderColor`: Semi-transparent white (18% opacity)
- `shadow*`: iOS shadow for depth
- `elevation: 8`: Android shadow

### 8.3 Blur Container

```typescript
blurContainer: {
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
},
```

**Effect**: BlurView fills entire card container as background layer

### 8.4 Card Content

```typescript
cardContent: {
  padding: 24,
},
```

**Purpose**: Padding for content inside card (on top of blur)

### 8.5 Text Styles

```typescript
title: {
  fontSize: 28,
  fontWeight: 'bold',
  marginBottom: 8,
},
subtitle: {
  fontSize: 16,
},
cardTitle: {
  fontSize: 18,
  fontWeight: '600',
  marginBottom: 16,
},
statValue: {
  fontSize: 32,
  fontWeight: 'bold',
  marginBottom: 4,
},
statLabel: {
  fontSize: 14,
},
```

**Font Hierarchy**:
1. **Stat Value**: 32px (largest)
2. **Welcome Title**: 28px
3. **Card Title**: 18px
4. **Subtitle**: 16px
5. **Stat Label**: 14px (smallest)

### 8.6 Stat Item Layout

```typescript
statItem: {
  alignItems: 'center',
},
```

**Effect**: Centers stat value and label vertically

---

## 9. Related Documentation

### Mobile Documentation
- **[MOBILE-NAVIGATION.md](./MOBILE-NAVIGATION.md)**: Bottom Tab Navigator (Home tab)
- **[MOBILE-SETUP.md](./MOBILE-SETUP.md)**: Metro bundler and dependencies
- **[MOBILE-LOGIN.md](./MOBILE-LOGIN.md)**: Login flow before Home screen
- **[MOBILE-SETTINGS.md](./MOBILE-SETTINGS.md)**: Settings screen

### Shared Documentation
- **[SHARED-CONTEXTS.md](../03-shared/SHARED-CONTEXTS.md)**: ThemeContext and useTheme
- **[SHARED-HOOKS.md](../03-shared/SHARED-HOOKS.md)**: useAuth hook
- **[SHARED-CONSTANTS.md](../03-shared/SHARED-CONSTANTS.md)**: THEME_COLORS

### Web Comparison
- **[WEB-HOME.md](../01-web/WEB-HOME.md)**: Web Home screen (simpler design)

### Core Documentation
- **[ARCHITECTURE.md](../00-core/ARCHITECTURE.md)**: Overall architecture
- **[DEVELOPMENT.md](../00-core/DEVELOPMENT.md)**: Development workflow

---

## Appendix: Future Enhancements

### Planned Features

1. **Real Statistics**:
   - Fetch from backend API
   - Display actual saved restaurants count
   - Display actual visits count
   - Add more stats (reviews, favorites, etc.)

2. **Additional Cards**:
   - Recent activity card
   - Quick actions card (Add restaurant, Search, etc.)
   - Recommendations card

3. **Animations**:
   - Fade-in animation on mount
   - Card press animation (scale)
   - Stats counter animation (count up)

4. **Interactive Stats**:
   - Tap stat to view details
   - Navigate to restaurant list filtered by stat

5. **Personalization**:
   - User avatar in welcome card
   - Customizable greeting message
   - User preferences display

---

## Appendix: BlurView Configuration

### Blur Types
- `'light'`: Light blur (for light backgrounds)
- `'dark'`: Dark blur (for dark backgrounds)
- `'extraDark'`: Very dark blur
- `'regular'`: Standard iOS blur
- `'prominent'`: Strong blur

### Blur Amount
- Range: 0-100
- Recommended: 10-30 for glassmorphism
- Higher values = stronger blur

### Fallback Color
- Used when device doesn't support blur
- Recommended: Semi-transparent color matching theme
- Format: `rgba(r, g, b, alpha)`

---

**Document Version**: 1.0.0
**Covers Files**: `HomeScreen.tsx`, glassmorphism design patterns
