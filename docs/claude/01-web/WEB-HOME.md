# WEB-HOME.md

> **Last Updated**: 2025-11-04
> **Purpose**: Home screen with restaurant rankings dashboard

---

## Table of Contents

1. [Overview](#1-overview)
2. [Component Structure](#2-component-structure)
3. [Implementation](#3-implementation)
4. [Restaurant Rankings](#4-restaurant-rankings)
5. [Theme Integration](#5-theme-integration)
6. [Navigation Integration](#6-navigation-integration)
7. [Best Practices](#7-best-practices)
8. [Related Documentation](#8-related-documentation)

---

## 1. Overview

The Home component is the main landing page displaying restaurant rankings by sentiment analysis (positive, negative, neutral).

### Key Features
- **Restaurant Rankings**: Top 5 restaurants by positive/negative/neutral rates
- **Neutral Filter Toggle**: Include/exclude neutral reviews from calculations
- **Cache Refresh**: Invalidate cache and fetch fresh data
- **Theme Support**: Adapts to light/dark theme
- **Restaurant Navigation**: Click ranking to view restaurant details
- **Header & Drawer**: Integrated navigation components
- **Real-time Loading**: Shows loading spinners during data fetch

### Component Hierarchy
```
Home
├── Header (with hamburger menu and theme toggle)
├── Content Area
│   ├── Page Title & Controls
│   │   ├── "레스토랑 순위" title
│   │   ├── Neutral Toggle Button (중립 제외/포함)
│   │   └── Refresh Button (🔄 새로고침)
│   ├── Error Display (if any)
│   └── Rankings Grid (3 columns)
│       ├── Positive Ranking Card (🌟 긍정 평가 TOP 5)
│       ├── Negative Ranking Card (⚠️부정 평가 TOP 5)
│       └── Neutral Ranking Card (➖ 중립 평가 TOP 5)
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

### 3.1 Dependencies

```typescript
import React, { useState } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native'
import { useNavigate } from 'react-router-dom'
import { useRankings } from '@shared/hooks'
import { useTheme } from '@shared/contexts'
import { THEME_COLORS } from '@shared/constants'
import type { RestaurantRanking, RestaurantRankingsResponse } from '@shared/services'
import Header from './Header'
import Drawer from './Drawer'
```

### 3.2 State Management

```typescript
const navigate = useNavigate()                    // React Router navigation
const { theme } = useTheme()                      // Get current theme
const [drawerVisible, setDrawerVisible] = useState(false)  // Drawer state
const [excludeNeutral, setExcludeNeutral] = useState(false)  // Neutral filter toggle

// useRankings hook - fetch rankings data
const {
  positiveRankings,    // Top restaurants by positive rate
  negativeRankings,    // Top restaurants by negative rate
  neutralRankings,     // Top restaurants by neutral rate
  loading,             // Loading state
  error,               // Error message
  refreshWithCacheInvalidation  // Force refresh from database
} = useRankings(
  5,                   // limit: 5 restaurants
  10,                  // minReviews: 10 analyzed reviews minimum
  undefined,           // category: no filter
  excludeNeutral       // excludeNeutral: dynamic toggle
)

const colors = THEME_COLORS[theme]                // Get theme colors
```

**State Variables**:
- `navigate`: React Router navigation function
- `theme`: Current theme ('light' | 'dark')
- `drawerVisible`: Boolean to control drawer visibility
- `excludeNeutral`: Boolean to exclude neutral reviews from calculations
- `positiveRankings`: Top 5 restaurants by positive rate (from useRankings)
- `negativeRankings`: Top 5 restaurants by negative rate (from useRankings)
- `neutralRankings`: Top 5 restaurants by neutral rate (from useRankings)
- `loading`: Boolean indicating data fetching state
- `error`: Error message string if fetch failed
- `colors`: Theme-specific color palette

### 3.3 Event Handlers

#### 3.3.1 Restaurant Navigation

```typescript
const handleRestaurantPress = (restaurantId: number) => {
  navigate(`/restaurant/${restaurantId}`)
}
```

**Behavior**: Navigate to restaurant detail page when ranking item is clicked.

#### 3.3.2 Logout Handler

```typescript
const handleLogout = async () => {
  await onLogout()                // Clear auth state and storage
  window.location.href = '/login' // Force reload to login page
}
```

**Behavior**: Same as before - clears storage and hard redirects to login.

### 3.4 Header Section

```typescript
<View style={styles.header}>
  <Text style={[styles.pageTitle, { color: colors.text }]}>레스토랑 순위</Text>
  <View style={styles.buttonGroup}>
    <TouchableOpacity
      style={[
        styles.toggleButton,
        excludeNeutral
          ? { backgroundColor: '#8b5cf6' }
          : { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 }
      ]}
      onPress={() => setExcludeNeutral(!excludeNeutral)}
      activeOpacity={0.7}
      disabled={loading}
    >
      <Text style={[
        styles.toggleButtonText,
        { color: excludeNeutral ? '#ffffff' : colors.text }
      ]}>
        {excludeNeutral ? '중립 제외' : '중립 포함'}
      </Text>
    </TouchableOpacity>
    <TouchableOpacity
      style={[styles.refreshButton, { backgroundColor: colors.primary }]}
      onPress={() => refreshWithCacheInvalidation()}
      activeOpacity={0.7}
      disabled={loading}
    >
      <Text style={styles.refreshButtonText}>🔄 새로고침</Text>
    </TouchableOpacity>
  </View>
</View>
```

**Components**:
1. **Page Title**: "레스토랑 순위" (Restaurant Rankings)
2. **Neutral Toggle Button**:
   - Active state (excludeNeutral=true): Purple background, white text, "중립 제외"
   - Inactive state (excludeNeutral=false): Surface background, border, "중립 포함"
   - Disabled during loading
3. **Refresh Button**:
   - Primary color background
   - 🔄 emoji + "새로고침" text
   - Calls `refreshWithCacheInvalidation()` to invalidate cache
   - Disabled during loading

---

## 4. Restaurant Rankings

### 4.1 Overview

The home screen displays three ranking cards in a grid layout:
1. **Positive Rankings** (🌟): Top 5 restaurants by positive sentiment rate
2. **Negative Rankings** (⚠️): Top 5 restaurants by negative sentiment rate
3. **Neutral Rankings** (➖): Top 5 restaurants by neutral sentiment rate

Each ranking is fetched automatically on mount using the `useRankings` hook.

### 4.2 Ranking Card Component

The `renderRankingCard` function renders a reusable card component for each ranking type.

```typescript
const renderRankingCard = (
  title: string,                                    // Card title
  emoji: string,                                    // Emoji icon
  rankingsResponse: RestaurantRankingsResponse | null,  // Rankings data
  rateKey: 'positiveRate' | 'negativeRate' | 'neutralRate',  // Rate field to display
  color: string                                     // Accent color for numbers
) => {
  const rankings = rankingsResponse?.rankings || null;

  return (
    <View style={[styles.rankingCard, {
      backgroundColor: colors.surface,
      borderColor: colors.border
    }]}>
      {/* Card Header */}
      <View style={styles.cardHeader}>
        <Text style={styles.emoji}>{emoji}</Text>
        <Text style={[styles.cardTitle, { color: colors.text }]}>{title}</Text>
      </View>

      {/* Loading State */}
      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={color} />
        </View>
      )}

      {/* Rankings List */}
      {!loading && rankings && rankings.length > 0 && (
        <View style={styles.rankingList}>
          {rankings.map((ranking: RestaurantRanking) => (
            <TouchableOpacity
              key={ranking.rank}
              style={[styles.rankingItem, { borderColor: colors.border }]}
              onPress={() => handleRestaurantPress(ranking.restaurant.id)}
            >
              <View style={styles.rankRow}>
                {/* Rank Number */}
                <Text style={[styles.rankNumber, { color }]}>
                  {ranking.rank}
                </Text>

                {/* Restaurant Info */}
                <View style={styles.restaurantInfo}>
                  <Text style={[styles.restaurantName, { color: colors.text }]}
                        numberOfLines={1}>
                    {ranking.restaurant.name}
                  </Text>
                  <Text style={[styles.restaurantCategory, { color: colors.textSecondary }]}
                        numberOfLines={1}>
                    {ranking.restaurant.category || '카테고리 없음'}
                  </Text>
                </View>

                {/* Rate & Review Count */}
                <View style={styles.rateContainer}>
                  <Text style={[styles.rateValue, { color }]}>
                    {ranking.statistics[rateKey].toFixed(1)}%
                  </Text>
                  <Text style={[styles.reviewCount, { color: colors.textSecondary }]}>
                    {ranking.statistics.analyzedReviews}개 리뷰
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Empty State */}
      {!loading && (!rankings || rankings.length === 0) && (
        <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
          순위 데이터가 없습니다
        </Text>
      )}
    </View>
  );
};
```

### 4.3 Ranking Card Usage

```typescript
<div className="rankings-grid">
  {renderRankingCard('긍정 평가 TOP 5', '🌟', positiveRankings, 'positiveRate', '#10b981')}
  {renderRankingCard('부정 평가 TOP 5', '⚠️', negativeRankings, 'negativeRate', '#ef4444')}
  {renderRankingCard('중립 평가 TOP 5', '➖', neutralRankings, 'neutralRate', '#8b5cf6')}
</div>
```

**Grid Layout** (CSS):
```css
.rankings-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
  gap: 24px;
}
```

**Parameters**:
| Card Type | Title | Emoji | Rankings Data | Rate Key | Color |
|-----------|-------|-------|---------------|----------|-------|
| Positive | 긍정 평가 TOP 5 | 🌟 | `positiveRankings` | `positiveRate` | Green (#10b981) |
| Negative | 부정 평가 TOP 5 | ⚠️ | `negativeRankings` | `negativeRate` | Red (#ef4444) |
| Neutral | 중립 평가 TOP 5 | ➖ | `neutralRankings` | `neutralRate` | Purple (#8b5cf6) |

### 4.4 Ranking Item Structure

Each ranking item displays:

```
┌────────────────────────────────────────────┐
│ 1  Restaurant Name             85.5%      │
│    Korean Cuisine              120개 리뷰  │
└────────────────────────────────────────────┘
  ↑  ↑                            ↑
  Rank  Restaurant Info           Rate & Count
```

**Layout**:
- **Rank Number**: Large, bold, colored (24px)
- **Restaurant Info** (flex: 1):
  - Name: 16px, bold, primary text color
  - Category: 13px, secondary text color
- **Rate Container**:
  - Rate: 20px, bold, colored (e.g., 85.5%)
  - Review Count: 12px, secondary text (e.g., 120개 리뷰)

**Interaction**: Clicking a ranking item navigates to restaurant detail page.

### 4.5 Loading & Empty States

**Loading State**:
```typescript
{loading && (
  <View style={styles.loadingContainer}>
    <ActivityIndicator size="large" color={color} />
  </View>
)}
```
- Shows colored spinner in center of card
- Prevents user interaction

**Empty State**:
```typescript
{!loading && (!rankings || rankings.length === 0) && (
  <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
    순위 데이터가 없습니다
  </Text>
)}
```
- Shows when no rankings data is available
- Uses secondary text color

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
primary: colors.primary             // Refresh button (#007AFF)
```

### 5.2 Accent Colors (Fixed)

**Ranking Cards**: Use fixed accent colors regardless of theme
- **Positive**: Green `#10b981` (emerald-500)
- **Negative**: Red `#ef4444` (red-500)
- **Neutral**: Purple `#8b5cf6` (violet-500)
- **Toggle Active**: Purple `#8b5cf6` (when excludeNeutral is true)

These colors provide consistent visual meaning across themes.

### 5.3 Light Mode Appearance

```
Background: White (#FFFFFF)
Ranking Cards: Light gray (#F5F5F5)
Card Border: Light gray (#E0E0E0)
Page Title: Black (#000000)
Restaurant Names: Black (#000000)
Categories: Dark gray (#666666)
Positive Rate: Green (#10b981)
Negative Rate: Red (#ef4444)
Neutral Rate: Purple (#8b5cf6)
```

### 5.4 Dark Mode Appearance

```
Background: True black (#000000)
Ranking Cards: Dark gray (#1C1C1E)
Card Border: Dark gray (#38383A)
Page Title: White (#FFFFFF)
Restaurant Names: White (#FFFFFF)
Categories: Light gray (#ABABAB)
Positive Rate: Green (#10b981)
Negative Rate: Red (#ef4444)
Neutral Rate: Purple (#8b5cf6)
```

### 5.5 Theme Toggle

**User Action**: Click theme icon in Header (🌙/☀️)

**Result**:
1. Theme changes (light ↔ dark)
2. Home component re-renders with new colors
3. All theme-aware colors update instantly
4. Accent colors remain the same (positive/negative/neutral)
5. No flicker or delay

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

### 7.1 Always Use Theme Colors (Except Semantic Colors)

**❌ Bad** (hardcoded):
```typescript
<View style={{ backgroundColor: '#FFFFFF' }}>
```

**✅ Good** (theme colors):
```typescript
<View style={{ backgroundColor: colors.background }}>
```

**✅ Also Good** (semantic colors for rankings):
```typescript
<Text style={{ color: '#10b981' }}>85.5%</Text>  // Green for positive rate
<Text style={{ color: '#ef4444' }}>15.2%</Text>  // Red for negative rate
```

### 7.2 Handle Loading and Empty States

**❌ Bad** (no loading state):
```typescript
return (
  <View>
    {rankings.map(r => <Text>{r.name}</Text>)}
  </View>
)
```

**✅ Good** (with loading and empty):
```typescript
{loading && <ActivityIndicator />}
{!loading && rankings && rankings.length > 0 && (
  <View>{rankings.map(r => <Text>{r.name}</Text>)}</View>
)}
{!loading && (!rankings || rankings.length === 0) && (
  <Text>No data</Text>
)}
```

### 7.3 Disable Buttons During Loading

**❌ Bad** (can trigger multiple requests):
```typescript
<TouchableOpacity onPress={() => refreshWithCacheInvalidation()}>
  <Text>Refresh</Text>
</TouchableOpacity>
```

**✅ Good** (disabled during loading):
```typescript
<TouchableOpacity
  onPress={() => refreshWithCacheInvalidation()}
  disabled={loading}
>
  <Text>Refresh</Text>
</TouchableOpacity>
```

### 7.4 Use Safe Optional Chaining

**❌ Bad** (runtime error if null):
```typescript
const rankings = rankingsResponse.rankings
```

**✅ Good** (safe access):
```typescript
const rankings = rankingsResponse?.rankings || null
```

---

## 8. Related Documentation

### Web Documentation
- **[WEB-HEADER-DRAWER.md](./WEB-HEADER-DRAWER.md)**: Header and Drawer components
- **[WEB-THEME.md](./WEB-THEME.md)**: Theme system and color palette
- **[WEB-LAYOUT.md](./WEB-LAYOUT.md)**: Page layout patterns
- **[WEB-ROUTING.md](./WEB-ROUTING.md)**: Navigation and routing
- **[WEB-RESTAURANT.md](./WEB-RESTAURANT.md)**: Restaurant detail page (where rankings navigate to)

### Shared Documentation
- **[SHARED-HOOKS.md](../03-shared/SHARED-HOOKS.md)**: useRankings, useAuth hooks
- **[SHARED-CONTEXTS.md](../03-shared/SHARED-CONTEXTS.md)**: ThemeContext usage
- **[SHARED-SERVICES.md](../03-shared/SHARED-SERVICES.md)**: API service (getRestaurantRankings)

### Backend Documentation
- **[FRIENDLY-ROUTES.md](../04-friendly/FRIENDLY-ROUTES.md)**: Restaurant ranking API endpoint
- **[FRIENDLY-REPOSITORIES.md](../04-friendly/FRIENDLY-REPOSITORIES.md)**: Review summary repository

### Core Documentation
- **[ARCHITECTURE.md](../00-core/ARCHITECTURE.md)**: Overall architecture
- **[DEVELOPMENT.md](../00-core/DEVELOPMENT.md)**: Development workflow

---

**Document Version**: 2.0.0
**Last Updated**: 2025-11-04
**Covers Files**: `Home.tsx`, restaurant ranking dashboard
