# MOBILE-RESTAURANT-LIST.md

> **Last Updated**: 2025-10-23 22:15
> **Purpose**: Mobile Restaurant List screen with crawling, filtering, and Socket.io integration

---

## Table of Contents

1. [Overview](#1-overview)
2. [Component Structure](#2-component-structure)
3. [Implementation](#3-implementation)
4. [Search and Crawling](#4-search-and-crawling)
5. [Category Filtering](#5-category-filtering)
6. [Crawling Progress Display](#6-crawling-progress-display)
7. [Restaurant List](#7-restaurant-list)
8. [Pull to Refresh](#8-pull-to-refresh)
9. [Navigation](#9-navigation)
10. [Recrawl and Delete](#10-recrawl-and-delete)
11. [Socket.io Integration](#11-socketio-integration)
12. [Theme Integration](#12-theme-integration)
13. [Related Documentation](#13-related-documentation)

---

## 1. Overview

The Restaurant List screen is the main interface for viewing, searching, and managing restaurants. It provides real-time crawling progress, category filtering, and pull-to-refresh functionality.

### Key Features
- **URL Search**: Add new restaurants by URL or Place ID
- **Category Filter**: Horizontal scroll list with count badges
- **Real-time Progress**: Socket.io-powered progress bars (menu, review, DB)
- **Restaurant Cards**: List with recrawl and delete actions
- **Pull to Refresh**: Reload categories and restaurants
- **Navigation**: Navigate to detail screen with proper focus handling
- **Recrawl Modal**: Options for recrawling (menus, reviews, summary)
- **Delete Confirmation**: Alert-based confirmation dialog
- **Theme Support**: Full light/dark theme integration

### Component Layout
```
SafeAreaView
└── ScrollView (with RefreshControl)
    ├── Search Container
    │   ├── TextInput (URL/Place ID)
    │   └── Button (추가)
    ├── Category Section
    │   └── Horizontal ScrollView
    │       └── Category Cards (filterable)
    ├── Crawling Progress Section (conditional)
    │   ├── Menu Progress Bar
    │   ├── Review Progress Bar
    │   └── DB Progress Bar
    ├── Restaurant List Section
    │   └── Restaurant Cards
    │       ├── Name, Category, Address
    │       └── Actions (Recrawl ↻, Delete 🗑️)
    └── RecrawlModal (popup)
```

---

## 2. Component Structure

### 2.1 File Location

**Location**: `apps/mobile/src/screens/RestaurantListScreen.tsx`

### 2.2 Dependencies

```typescript
import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  useTheme,
  useSocket,
  THEME_COLORS,
  apiService,
  Alert,
  useRestaurantList,
  type RestaurantData
} from 'shared';
import type { RestaurantStackParamList } from '../navigation/types';
import RecrawlModal from '../components/RecrawlModal';
```

**Key Dependencies**:
- **useRestaurantList**: Shared hook for data management (categories, restaurants)
- **useSocket**: Socket.io for real-time progress updates
- **useNavigation**: React Navigation for screen transitions
- **RecrawlModal**: Custom modal component for recrawl options
- **Alert**: Cross-platform alert utility

---

## 3. Implementation

### 3.1 State Management

```typescript
const navigation = useNavigation<NavigationProp>();
const { theme } = useTheme();
const colors = THEME_COLORS[theme];
const { menuProgress, crawlProgress, dbProgress, setRestaurantCallbacks, resetCrawlStatus } = useSocket();

const [recrawlModalVisible, setRecrawlModalVisible] = useState(false);
const [selectedRestaurant, setSelectedRestaurant] = useState<RestaurantData | null>(null);
const [refreshing, setRefreshing] = useState(false);

// useRestaurantList hook
const {
  url,
  setUrl,
  loading,
  categories,
  categoriesLoading,
  restaurants,
  restaurantsLoading,
  total,
  selectedCategory,
  setSelectedCategory,
  handleCrawl: sharedHandleCrawl,
  fetchRestaurants,
  fetchCategories,
} = useRestaurantList({
  onCrawlSuccess: (restaurant: RestaurantData | null) => {
    if (restaurant) {
      navigation.navigate('RestaurantDetail', {
        restaurantId: restaurant.id,
        restaurant: restaurant,
      });
    }
  },
});
```

**State Sources**:
- `useSocket()`: Real-time progress (menuProgress, crawlProgress, dbProgress)
- `useRestaurantList()`: Data and actions from shared hook
- Local state: Modal visibility, selected restaurant, refresh state

### 3.2 Style Memoization

```typescript
const inputStyle = React.useMemo(
  () => [
    styles.input,
    {
      borderColor: colors.border,
      color: colors.text,
      backgroundColor: theme === 'light' ? '#ffffff' : colors.surface,
    },
  ],
  [colors.border, colors.text, colors.surface, theme]
);

const searchButtonStyle = React.useMemo(
  () => [
    styles.searchButton,
    {
      backgroundColor: theme === 'light' ? '#f5f5f5' : colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
  ],
  [colors.surface, colors.border, theme]
);
```

**Purpose**: iOS TextInput performance optimization
- Prevents unnecessary re-renders
- Reduces style calculations

---

## 4. Search and Crawling

### 4.1 Search Input

```typescript
<View style={styles.searchContainer}>
  <TextInput
    style={inputStyle}
    placeholder="URL 또는 Place ID를 입력하세요"
    placeholderTextColor={colors.textSecondary}
    value={url}
    onChangeText={setUrl}
    keyboardAppearance={theme === 'dark' ? 'dark' : 'light'}
  />
  <TouchableOpacity
    style={searchButtonStyle}
    onPress={handleCrawl}
    disabled={loading}
  >
    {loading ? (
      <ActivityIndicator size="small" color={colors.primary} />
    ) : (
      <Text style={searchButtonTextStyle}>추가</Text>
    )}
  </TouchableOpacity>
</View>
```

**Input Props**:
- `keyboardAppearance`: Match keyboard to theme (dark/light)
- `placeholderTextColor`: Theme-aware placeholder
- `value`, `onChangeText`: Controlled by shared hook

**Button States**:
- **Idle**: "추가" text
- **Loading**: ActivityIndicator spinner

### 4.2 Crawl Handler

```typescript
const handleCrawl = async () => {
  resetCrawlStatus();

  setRestaurantCallbacks({
    onReviewCrawlCompleted: async () => {
      await fetchRestaurants();
      await fetchCategories();
    },
    onReviewCrawlError: async () => {
      await fetchRestaurants();
      await fetchCategories();
    }
  });

  await sharedHandleCrawl();
};
```

**Flow**:
1. Reset Socket crawl status
2. Set Socket callbacks (refresh data on completion/error)
3. Call shared crawl handler (API + validation)
4. On success: Navigate to detail screen (via `onCrawlSuccess` callback)

**Why Reset Status?**:
- Clear previous progress before starting new crawl
- Prevents stale progress from previous crawl

---

## 5. Category Filtering

### 5.1 Category Section

```typescript
<View style={styles.section}>
  <View style={styles.sectionHeader}>
    <Text style={[styles.sectionTitle, { color: colors.text }]}>카테고리</Text>
    {categoriesLoading && <ActivityIndicator size="small" color={colors.text} />}
  </View>
  {categories.length > 0 ? (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.categoriesScrollContent}
    >
      {categories.map((category) => (
        <TouchableOpacity
          key={category.category}
          onPress={() => handleCategoryClick(category.category)}
          activeOpacity={0.7}
        >
          <View
            style={[
              styles.categoryCardContainer,
              theme === 'dark' ? styles.categoryCardDark : styles.categoryCardLight,
              selectedCategory === category.category && {
                borderColor: colors.primary,
                borderWidth: 2,
              }
            ]}
          >
            <View style={styles.categoryCardContent}>
              <Text style={[
                styles.categoryName,
                { color: selectedCategory === category.category ? colors.primary : colors.text }
              ]}>
                {category.category}
              </Text>
              <Text style={[styles.categoryCount, { color: colors.textSecondary }]}>
                {category.count}개
              </Text>
            </View>
          </View>
        </TouchableOpacity>
      ))}
    </ScrollView>
  ) : !categoriesLoading ? (
    <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
      등록된 카테고리가 없습니다
    </Text>
  ) : null}
</View>
```

**Layout**: Horizontal ScrollView with category cards

**Card States**:
- **Unselected**: Default border, text color
- **Selected**: Primary border (2px), primary text color

### 5.2 Category Click Handler

```typescript
const handleCategoryClick = (category: string) => {
  if (selectedCategory === category) {
    setSelectedCategory(null); // Toggle off if already selected
  } else {
    setSelectedCategory(category); // Select category
  }
};
```

**Behavior**: Toggle filter on/off

**Effect**: `useRestaurantList` hook filters restaurants by selected category

### 5.3 Category Card Styling

```typescript
categoryCardContainer: {
  overflow: 'hidden',
  borderRadius: 16,
  borderWidth: 1.5,
  minWidth: 100,
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 8 },
  shadowOpacity: 0.15,
  shadowRadius: 16,
  elevation: 8,
},
categoryCardLight: {
  borderColor: 'rgba(0, 0, 0, 0.08)',
  backgroundColor: 'rgba(255, 255, 255, 0.8)',
},
categoryCardDark: {
  borderColor: 'rgba(255, 255, 255, 0.18)',
  backgroundColor: 'rgba(26, 26, 26, 0.3)',
},
```

**Visual Effect**: Subtle shadow, semi-transparent background

---

## 6. Crawling Progress Display

### 6.1 Progress Section

```typescript
{(menuProgress !== null || crawlProgress !== null || dbProgress !== null) && (
  <View style={styles.section}>
    <View style={styles.sectionHeader}>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>크롤링 진행 상황</Text>
      <ActivityIndicator size="small" color={colors.primary} />
    </View>

    {menuProgress && menuProgress.total > 0 && (
      <View style={[styles.progressCard, {...}]}>
        {/* Menu progress bar */}
      </View>
    )}

    {crawlProgress && crawlProgress.total > 0 && (
      <View style={[styles.progressCard, {...}]}>
        {/* Review progress bar */}
      </View>
    )}

    {dbProgress && dbProgress.total > 0 && (
      <View style={[styles.progressCard, {...}]}>
        {/* DB progress bar */}
      </View>
    )}
  </View>
)}
```

**Conditional Rendering**: Only shows when at least one progress exists

### 6.2 Progress Card

```typescript
<View style={[styles.progressCard, {
  backgroundColor: theme === 'light' ? '#ffffff' : colors.surface,
  borderColor: colors.border
}]}>
  <View style={styles.progressHeader}>
    <Text style={[styles.progressLabel, { color: colors.textSecondary }]}>
      리뷰 수집
    </Text>
    <Text style={[styles.progressValue, { color: colors.text }]}>
      {crawlProgress.current} / {crawlProgress.total}
    </Text>
  </View>
  <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
    <View
      style={[
        styles.progressBarFill,
        { width: `${crawlProgress.percentage}%`, backgroundColor: '#2196f3' }
      ]}
    />
  </View>
  <Text style={[styles.progressPercentage, { color: colors.textSecondary }]}>
    {crawlProgress.percentage}%
  </Text>
</View>
```

**Progress Card Layout**:
1. **Header**: Label + Current/Total count
2. **Progress Bar**: Background bar + filled portion
3. **Percentage**: Right-aligned percentage text

### 6.3 Progress Bar Colors

- **Menu**: Green (#4caf50)
- **Review**: Blue (#2196f3)
- **DB**: Primary color (theme-aware)

**Why Different Colors?**: Visual distinction between different phases

---

## 7. Restaurant List

### 7.1 Restaurant List Section

```typescript
<View style={styles.section}>
  <View style={styles.sectionHeader}>
    <Text style={[styles.sectionTitle, { color: colors.text }]}>
      레스토랑 목록 ({total})
    </Text>
    {restaurantsLoading && <ActivityIndicator size="small" color={colors.text} />}
  </View>
  {restaurants.length > 0 ? (
    <View style={styles.restaurantsList}>
      {restaurants.map((restaurant) => (
        <TouchableOpacity
          key={restaurant.id}
          style={[...]}
          onPress={() => handleRestaurantPress(restaurant)}
          activeOpacity={0.7}
        >
          {/* Restaurant card content */}
        </TouchableOpacity>
      ))}
    </View>
  ) : !restaurantsLoading ? (
    <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
      등록된 레스토랑이 없습니다
    </Text>
  ) : null}
</View>
```

**Header**: Title with count + loading indicator

**Empty State**: Shows when no restaurants and not loading

### 7.2 Restaurant Card

```typescript
<View style={styles.restaurantCardContentWrapper}>
  <View style={styles.restaurantCardContent}>
    <Text style={[styles.restaurantName, { color: colors.text }]} numberOfLines={1}>
      {restaurant.name}
    </Text>
    {restaurant.category && (
      <Text style={[styles.restaurantCategory, { color: colors.textSecondary }]} numberOfLines={1}>
        {restaurant.category}
      </Text>
    )}
    {restaurant.address && (
      <Text style={[styles.restaurantAddress, { color: colors.textSecondary }]} numberOfLines={1}>
        {restaurant.address}
      </Text>
    )}
  </View>
  <View style={{ flexDirection: 'row', gap: 8 }}>
    <TouchableOpacity
      style={[styles.actionButton, { backgroundColor: colors.border }]}
      onPress={(e: any) => handleRecrawlClick(restaurant, e)}
    >
      <Text style={[styles.actionIcon, { color: colors.text }]}>↻</Text>
    </TouchableOpacity>
    <TouchableOpacity
      style={[styles.actionButton, { backgroundColor: '#ff4444' }]}
      onPress={(e: any) => handleDeleteClick(restaurant, e)}
    >
      <Text style={[styles.actionIcon, { color: '#fff' }]}>🗑️</Text>
    </TouchableOpacity>
  </View>
</View>
```

**Layout**: Horizontal row with info (left) and actions (right)

**Actions**:
- **Recrawl** (↻): Gray background, opens RecrawlModal
- **Delete** (🗑️): Red background, shows confirmation dialog

**Text Truncation**: `numberOfLines={1}` prevents overflow

### 7.3 Restaurant Card Styling

```typescript
restaurantCardContainer: {
  overflow: 'hidden',
  borderBottomWidth: 1,
  paddingVertical: 16,
},
restaurantCardLight: {
  borderBottomColor: 'rgba(0, 0, 0, 0.08)',
  backgroundColor: 'transparent',
},
restaurantCardDark: {
  borderBottomColor: 'rgba(255, 255, 255, 0.12)',
  backgroundColor: 'transparent',
},
```

**Visual Effect**: Bottom border separator (no card background)

---

## 8. Pull to Refresh

### 8.1 RefreshControl

```typescript
<ScrollView
  style={styles.scrollView}
  contentContainerStyle={styles.content}
  showsVerticalScrollIndicator={false}
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

**Props**:
- `refreshing`: Boolean state (shows spinner when true)
- `onRefresh`: Callback when user pulls down
- `tintColor`: Spinner color (iOS)
- `colors`: Spinner color (Android)

### 8.2 Refresh Handler

```typescript
const onRefresh = useCallback(async () => {
  setRefreshing(true);
  try {
    await Promise.all([
      fetchCategories(),
      fetchRestaurants()
    ]);
  } catch (error) {
    console.error('새로고침 실패:', error);
  } finally {
    setRefreshing(false);
  }
}, [fetchCategories, fetchRestaurants]);
```

**Flow**:
1. Set `refreshing` to true (show spinner)
2. Fetch categories and restaurants in parallel
3. Set `refreshing` to false (hide spinner)

**useCallback**: Prevents re-creating function on every render

---

## 9. Navigation

### 9.1 Navigation to Detail

```typescript
const handleRestaurantPress = (restaurant: RestaurantData) => {
  const waitForFocus = (attempt: number = 0) => {
    const maxAttempts = 5; // Max 500ms

    if (navigation.isFocused()) {
      // Focused → Navigate
      navigation.navigate('RestaurantDetail', {
        restaurantId: restaurant.id,
        restaurant: restaurant,
      });
    } else if (attempt < maxAttempts - 1) {
      // Not focused → Retry after 100ms
      setTimeout(() => waitForFocus(attempt + 1), 100);
    }
  };

  waitForFocus(0);
};
```

**Why Wait for Focus?**:
- Prevents navigation from unfocused screen
- Fixes race condition when quickly switching tabs

**Retry Logic**:
- Checks focus every 100ms
- Max 5 attempts (500ms total)

### 9.2 Navigate After Crawl

```typescript
const {
  // ...
  handleCrawl: sharedHandleCrawl,
  // ...
} = useRestaurantList({
  onCrawlSuccess: (restaurant: RestaurantData | null) => {
    if (restaurant) {
      navigation.navigate('RestaurantDetail', {
        restaurantId: restaurant.id,
        restaurant: restaurant,
      });
    }
  },
});
```

**Flow**: After successful crawl, automatically navigate to detail screen

---

## 10. Recrawl and Delete

### 10.1 Recrawl Click Handler

```typescript
const handleRecrawlClick = (restaurant: RestaurantData, event: any) => {
  event.stopPropagation(); // Prevent card click
  setSelectedRestaurant(restaurant);
  setRecrawlModalVisible(true);
};
```

**event.stopPropagation()**: Prevents triggering parent `TouchableOpacity` (card press)

### 10.2 Recrawl Confirm

```typescript
const handleRecrawlConfirm = async (options: {
  crawlMenus: boolean;
  crawlReviews: boolean;
  createSummary: boolean
}) => {
  if (!selectedRestaurant) return;

  try {
    const response = await apiService.recrawlRestaurant(selectedRestaurant.id, options);
    if (response.result) {
      Alert.show('재크롤링 시작', '백그라운드에서 크롤링이 진행됩니다.');
    } else {
      Alert.error('재크롤링 실패', response.message || '재크롤링을 시작할 수 없습니다.');
    }
  } catch (error) {
    console.error('Recrawl error:', error);
    Alert.error('오류', '재크롤링 중 오류가 발생했습니다.');
  }
};
```

**Options**:
- `crawlMenus`: Recrawl menus
- `crawlReviews`: Recrawl reviews
- `createSummary`: Generate AI summary

**Alert Feedback**: Shows success/error message

### 10.3 Delete Click Handler

```typescript
const handleDeleteClick = (restaurant: RestaurantData, event: any) => {
  event.stopPropagation();

  Alert.confirm(
    '레스토랑 삭제',
    `${restaurant.name}을(를) 삭제하시겠습니까?\n모든 메뉴, 리뷰, 이미지가 함께 삭제되며 복구할 수 없습니다.`,
    async () => {
      // Confirm callback
      try {
        const response = await apiService.deleteRestaurant(restaurant.id);

        if (response.result && response.data) {
          await Promise.all([
            fetchRestaurants(),
            fetchCategories()
          ]);
        } else {
          Alert.error('삭제 실패', response.message || '레스토랑 삭제에 실패했습니다');
        }
      } catch (error) {
        console.error('Delete error:', error);
        Alert.error('삭제 오류', '레스토랑 삭제 중 오류가 발생했습니다');
      }
    },
    () => {
      // Cancel callback (do nothing)
    }
  );
};
```

**Alert.confirm**: Shows confirmation dialog with OK/Cancel buttons

**Success Flow**: Delete API → Refresh restaurants and categories

---

## 11. Socket.io Integration

### 11.1 Socket State

```typescript
const {
  menuProgress,
  crawlProgress,
  dbProgress,
  setRestaurantCallbacks,
  resetCrawlStatus
} = useSocket();
```

**Progress Objects**: `{ current, total, percentage }`

### 11.2 Socket Callbacks

```typescript
const handleCrawl = async () => {
  resetCrawlStatus();

  setRestaurantCallbacks({
    onReviewCrawlCompleted: async () => {
      await fetchRestaurants();
      await fetchCategories();
    },
    onReviewCrawlError: async () => {
      await fetchRestaurants();
      await fetchCategories();
    }
  });

  await sharedHandleCrawl();
};
```

**Callbacks**: Refresh data when crawl completes or errors

**Why Both Callbacks?**: Ensure UI updates regardless of success/failure

### 11.3 Real-time Updates

**Flow**:
1. User submits URL
2. Backend starts crawling
3. Socket events fired: `review:started`, `review:crawl_progress`, etc.
4. SocketContext updates progress state
5. Component re-renders with new progress
6. Progress bars animate

**See**: `SHARED-CONTEXTS.md` for SocketContext details

---

## 12. Theme Integration

### 12.1 Theme Colors

```typescript
const { theme } = useTheme();
const colors = THEME_COLORS[theme];
```

**Applied Colors**:
- `colors.background`: ScrollView background
- `colors.surface`: Input, button, card backgrounds
- `colors.text`: Primary text
- `colors.textSecondary`: Secondary text, placeholders
- `colors.border`: Borders, progress bar background
- `colors.primary`: Active elements, progress bars

### 12.2 Dynamic Styling

```typescript
// Input background
backgroundColor: theme === 'light' ? '#ffffff' : colors.surface

// Category card
theme === 'dark' ? styles.categoryCardDark : styles.categoryCardLight

// Progress card
backgroundColor: theme === 'light' ? '#ffffff' : colors.surface
```

**Pattern**: Ternary operator for theme-specific values

### 12.3 Keyboard Appearance

```typescript
<TextInput
  keyboardAppearance={theme === 'dark' ? 'dark' : 'light'}
/>
```

**Effect**: Keyboard color matches app theme

---

## 13. Related Documentation

### Mobile Documentation
- **[MOBILE-RESTAURANT-DETAIL.md](./MOBILE-RESTAURANT-DETAIL.md)**: Detail screen navigation target
- **[MOBILE-NAVIGATION.md](./MOBILE-NAVIGATION.md)**: Stack Navigator setup
- **[MOBILE-SETUP.md](./MOBILE-SETUP.md)**: Metro bundler configuration

### Shared Documentation
- **[SHARED-HOOKS.md](../03-shared/SHARED-HOOKS.md)**: useRestaurantList hook
- **[SHARED-CONTEXTS.md](../03-shared/SHARED-CONTEXTS.md)**: SocketContext, ThemeContext
- **[SHARED-UTILS.md](../03-shared/SHARED-UTILS.md)**: Alert utility
- **[SHARED-COMPONENTS.md](../03-shared/SHARED-COMPONENTS.md)**: RecrawlModal

### Web Comparison
- **[WEB-RESTAURANT.md](../01-web/WEB-RESTAURANT.md)**: Web restaurant list (split-panel vs full-screen)

### Friendly Server Documentation
- **[FRIENDLY-RESTAURANT.md](../04-friendly/FRIENDLY-RESTAURANT.md)**: Restaurant API endpoints
- **[FRIENDLY-JOB-SOCKET.md](../04-friendly/FRIENDLY-JOB-SOCKET.md)**: Socket.io implementation

### Core Documentation
- **[ARCHITECTURE.md](../00-core/ARCHITECTURE.md)**: Overall architecture
- **[DEVELOPMENT.md](../00-core/DEVELOPMENT.md)**: Development workflow

---

## Appendix: RecrawlModal Component

**Location**: `apps/mobile/src/components/RecrawlModal.tsx`

**Props**:
```typescript
interface RecrawlModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: (options: { crawlMenus: boolean; crawlReviews: boolean; createSummary: boolean }) => void;
  restaurantName: string;
}
```

**Features**:
- Checkboxes for crawl options (menus, reviews, summary)
- Confirm/Cancel buttons
- Modal overlay

---

## Appendix: Performance Optimizations

### Style Memoization

```typescript
const inputStyle = React.useMemo(
  () => [...],
  [colors.border, colors.text, colors.surface, theme]
);
```

**Why**: Prevents style recalculation on every render

### Callback Memoization

```typescript
const onRefresh = useCallback(async () => {
  // ...
}, [fetchCategories, fetchRestaurants]);
```

**Why**: Prevents RefreshControl from re-mounting

### Platform-Specific Optimizations

- **iOS**: Memoized styles for TextInput performance
- **Android**: elevation vs shadowOpacity

---

**Document Version**: 1.0.0
**Covers Files**: `RestaurantListScreen.tsx`, `RecrawlModal.tsx`, Socket.io integration
