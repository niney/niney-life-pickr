# MOBILE-HOME.md

> **Last Updated**: 2025-11-04
> **Purpose**: Mobile Home screen with restaurant rankings and glassmorphism design

---

## Table of Contents

1. [Overview](#1-overview)
2. [Component Structure](#2-component-structure)
3. [Implementation](#3-implementation)
4. [Ranking Cards](#4-ranking-cards)
5. [Navigation](#5-navigation)
6. [Theme Integration](#6-theme-integration)
7. [Related Documentation](#7-related-documentation)

---

## 1. Overview

The Home screen displays restaurant rankings by sentiment analysis (positive, negative, neutral) with a modern glassmorphism design.

### Key Features
- **Restaurant Rankings**: Top 5 restaurants by positive/negative/neutral rates
- **Glassmorphism Design**: Frosted glass effect with BlurView
- **Pull-to-Refresh**: RefreshControl for manual data refresh
- **Neutral Filter Toggle**: Include/exclude neutral reviews from calculations
- **Cache Refresh Button**: Invalidate cache and fetch fresh data
- **Restaurant Navigation**: Tap ranking to view restaurant details
- **Theme Support**: Adapts blur type and colors to light/dark theme
- **Loading States**: ActivityIndicator for each ranking card

### Component Layout
```
HomeScreen
└── ScrollView (theme background + RefreshControl)
    └── Content Container
        ├── Header
        │   ├── Page Title: "레스토랑 순위"
        │   └── Button Group
        │       ├── Neutral Toggle: "중립 제외/포함"
        │       └── Refresh Button: "🔄 새로고침"
        ├── Positive Ranking Card (🌟 긍정 평가 TOP 5)
        │   ├── BlurView (glassmorphism background)
        │   └── Ranking List (5 items)
        ├── Negative Ranking Card (⚠️부정 평가 TOP 5)
        │   └── ...
        └── Neutral Ranking Card (➖ 중립 평가 TOP 5)
            └── ...
```

---

## 2. Component Structure

**Location**: `apps/mobile/src/screens/HomeScreen.tsx`

**Key Dependencies**:
- **BlurView**: `@react-native-community/blur` for glassmorphism effect
- **useRankings**: Fetch restaurant rankings data
- **useTheme**: Access current theme (light/dark)
- **RefreshControl**: Pull-to-refresh functionality
- **Navigation**: Navigate to restaurant detail screen

---

## 3. Implementation

### 3.1 State Management

```typescript
const navigation = useNavigation<NavigationProp>();
const { theme } = useTheme();
const [refreshing, setRefreshing] = useState(false);
const [excludeNeutral, setExcludeNeutral] = useState(false);

// Fetch rankings with useRankings hook
const {
  positiveRankings,
  negativeRankings,
  neutralRankings,
  loading,
  error,
  refresh,
  refreshWithCacheInvalidation
} = useRankings(5, 10, undefined, excludeNeutral);
```

### 3.2 Pull-to-Refresh

```typescript
const onRefresh = useCallback(async () => {
  setRefreshing(true);
  await refresh();  // Use cached data
  setRefreshing(false);
}, [refresh]);

// In ScrollView
<ScrollView
  refreshControl={
    <RefreshControl
      refreshing={refreshing}
      onRefresh={onRefresh}
      tintColor={colors.primary}
      colors={[colors.primary]}
    />
  }
>
```

### 3.3 Restaurant Navigation

```typescript
const handleRestaurantPress = (restaurantId: number) => {
  // 1. Switch to Restaurant tab first
  navigation.navigate('Restaurant');

  // 2. Then navigate to RestaurantDetail
  setTimeout(() => {
    (navigation as any).navigate('Restaurant', {
      screen: 'RestaurantDetail',
      params: { restaurantId },
    });
  }, 0);
};
```

**Note**: Two-step navigation ensures RestaurantList is in the stack before navigating to detail.

---

## 4. Ranking Cards

### 4.1 Glassmorphism Card Structure

Each ranking card uses BlurView for glassmorphism effect:

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
  <View style={styles.cardHeader}>
    <Text style={styles.emoji}>{emoji}</Text>
    <Text style={[styles.cardTitle, { color: colors.text }]}>{title}</Text>
  </View>

  {loading && <ActivityIndicator size="large" color={color} />}
  
  {!loading && rankings && rankings.map((ranking: RestaurantRanking) => (
    <TouchableOpacity
      key={ranking.rank}
      onPress={() => handleRestaurantPress(ranking.restaurant.id)}
    >
      <Text>{ranking.rank}. {ranking.restaurant.name} - {ranking.statistics[rateKey].toFixed(1)}%</Text>
    </TouchableOpacity>
  ))}
</View>
</View>
```

### 4.2 Ranking Item

Each ranking displays:
- Rank number (colored)
- Restaurant name and category
- Sentiment rate percentage
- Review count

---

## 5. Navigation

### 5.1 Two-Step Navigation Pattern

```typescript
const handleRestaurantPress = (restaurantId: number) => {
  // Step 1: Switch to Restaurant tab
  navigation.navigate('Restaurant');

  // Step 2: Navigate to detail screen
  setTimeout(() => {
    (navigation as any).navigate('Restaurant', {
      screen: 'RestaurantDetail',
      params: { restaurantId },
    });
  }, 0);
};
```

**Why two steps?**
- Ensures RestaurantList is mounted in the navigation stack
- Prevents navigation errors when coming from Home tab
- Maintains proper back button behavior

---

## 6. Theme Integration

### 6.1 Glassmorphism Colors

**Light Mode**:
- BlurView: `'light'` blur type
- Fallback: `rgba(255, 255, 255, 0.7)` (white with 70% opacity)

**Dark Mode**:
- BlurView: `'dark'` blur type
- Fallback: `rgba(26, 26, 26, 0.7)` (dark gray with 70% opacity)

### 6.2 Accent Colors

- **Positive**: Green `#10b981`
- **Negative**: Red `#ef4444`
- **Neutral**: Purple `#8b5cf6`

---

## 7. Related Documentation

### Mobile Documentation
- **[MOBILE-NAVIGATION.md](./MOBILE-NAVIGATION.md)**: Tab and stack navigation
- **[MOBILE-RESTAURANT-DETAIL.md](./MOBILE-RESTAURANT-DETAIL.md)**: Restaurant detail screen

### Shared Documentation
- **[SHARED-HOOKS.md](../03-shared/SHARED-HOOKS.md)**: useRankings hook
- **[SHARED-CONTEXTS.md](../03-shared/SHARED-CONTEXTS.md)**: ThemeContext

### Backend Documentation
- **[FRIENDLY-ROUTES.md](../04-friendly/FRIENDLY-ROUTES.md)**: Rankings API endpoint

---

**Document Version**: 2.0.0
**Last Updated**: 2025-11-04
**Covers Files**: `HomeScreen.tsx`, restaurant ranking dashboard with glassmorphism
