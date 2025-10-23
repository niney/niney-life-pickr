# MOBILE-RESTAURANT-DETAIL.md

> **Last Updated**: 2025-10-23 22:20
> **Purpose**: Mobile Restaurant Detail screen - most complex screen with tabs, infinite scroll, and real-time updates

---

## ⚠️ Important Note

This is the most complex screen in the mobile app (**2156 lines**). It combines multiple advanced features:
- Tab navigation (4 tabs)
- Real-time Socket.io progress updates
- Infinite scroll with sentiment filtering
- AI review summarization
- Image viewing
- Complex scroll behavior with sticky headers

---

## Table of Contents

1. [Overview](#1-overview)
2. [Component Architecture](#2-component-architecture)
3. [Tab System](#3-tab-system)
4. [Scroll Behavior](#4-scroll-behavior)
5. [Restaurant Header](#5-restaurant-header)
6. [Progress Display](#6-progress-display)
7. [Menu Tab](#7-menu-tab)
8. [Review Tab](#8-review-tab)
9. [AI Summary Display](#9-ai-summary-display)
10. [Statistics Tab](#10-statistics-tab)
11. [Map Tab](#11-map-tab)
12. [Socket.io Integration](#12-socketio-integration)
13. [Related Documentation](#13-related-documentation)

---

## 1. Overview

The Restaurant Detail screen displays comprehensive information about a single restaurant across 4 tabs: Menu, Review, Statistics, and Map. It features real-time crawling progress, infinite scroll reviews, sentiment filtering, and AI-powered review summarization.

### Key Features
- **4 Tabs**: Menu, Review, Statistics, Map
- **Sticky Tab Bar**: Tabs remain visible when scrolling
- **Snap-to Scroll**: Scroll snaps to header top or after header
- **Real-time Progress**: Socket.io updates for crawling (menu, review, image, DB)
- **Infinite Scroll**: Load more reviews automatically
- **Sentiment Filter**: Filter reviews by positive/negative/neutral
- **Search**: Search reviews by keyword
- **AI Summaries**: Display sentiment, satisfaction score, key keywords, menu items
- **Resummary Modal**: Re-generate AI summary with different models
- **Image Viewer**: Full-screen image viewing with swipe
- **Pull to Refresh**: Reload reviews and menus
- **Deep Links**: Open Naver Map app or web

### Component Layout
```
View (container)
└── ScrollView (with RefreshControl, sticky tabs)
    ├── Restaurant Header (measured for height)
    │   ├── Info Card (name, category, address, counts)
    │   └── Progress Display (conditional, when crawling)
    ├── Tab Bar (sticky)
    │   ├── Tab Buttons (menu, review, statistics, map)
    │   └── Sentiment Filter (review tab only)
    ├── Menu Tab Content (conditional)
    │   └── Menu Grid (with images)
    ├── Review Tab Content (conditional)
    │   ├── Review Cards (infinite scroll)
    │   │   ├── User info, keywords
    │   │   ├── Review text, images
    │   │   └── AI Summary section
    │   └── Load More Indicator
    ├── Statistics Tab Content (conditional)
    │   └── Menu Statistics
    └── Map Tab Content (conditional)
        └── Map Link Button
```

---

## 2. Component Architecture

### 2.1 File Location

**Location**: `apps/mobile/src/screens/RestaurantDetailScreen.tsx`

**File Size**: 2156 lines (largest mobile screen)

### 2.2 Dependencies

```typescript
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, ActivityIndicator,
  TouchableOpacity, RefreshControl, Image, Modal, Linking, TextInput,
} from 'react-native';
import { useRoute, RouteProp } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faStar, faStarHalfStroke, faSearch, faTimes } from '@fortawesome/free-solid-svg-icons';
import { faStar as farStar } from '@fortawesome/free-regular-svg-icons';
import ImageViewing from 'react-native-image-viewing';
import {
  useTheme, useSocket, THEME_COLORS, useReviews, useMenus,
  getDefaultApiUrl, Alert
} from 'shared';
import type { RestaurantStackParamList } from '../navigation/types';
```

**Key Dependencies**:
- **FontAwesome**: Star icons for ratings
- **ImageViewing**: Full-screen image viewer
- **useReviews**: Shared hook for review data, filtering, infinite scroll
- **useMenus**: Shared hook for menu data
- **useSocket**: Socket.io for real-time progress

### 2.3 State Management

```typescript
// Route params
const route = useRoute<RestaurantDetailRouteProp>();
const { restaurantId, restaurant } = route.params;

// Theme and layout
const { theme } = useTheme();
const colors = THEME_COLORS[theme];
const insets = useSafeAreaInsets();

// Socket progress
const {
  menuProgress, crawlProgress, dbProgress, imageProgress,
  reviewSummaryStatus, summaryProgress,
  joinRestaurantRoom, leaveRestaurantRoom,
  setRestaurantCallbacks, resetCrawlStatus, resetSummaryStatus
} = useSocket();

// Tab state
const [activeTab, setActiveTab] = useState<TabType>('menu');

// Scroll handling
const [headerHeight, setHeaderHeight] = useState(0);
const currentScrollY = useRef(0);
const [pendingScrollY, setPendingScrollY] = useState<number | null>(null);
const scrollViewRef = useRef<ScrollView>(null);

// UI state
const [refreshing, setRefreshing] = useState(false);
const [imageViewerVisible, setImageViewerVisible] = useState(false);
const [imageViewerIndex, setImageViewerIndex] = useState(0);
const [imageViewerUrls, setImageViewerUrls] = useState<string[]>([]);
const [expandedKeywords, setExpandedKeywords] = useState<Set<number>>(new Set());
const [resummaryModalVisible, setResummaryModalVisible] = useState(false);
const [selectedReviewId, setSelectedReviewId] = useState<number | null>(null);
const [selectedModel, setSelectedModel] = useState<string>('gpt-oss:20b-cloud');
const [menuStatistics, setMenuStatistics] = useState<any>(null);

// Shared hooks
const {
  reviews, reviewsLoading, reviewsLoadingMore, reviewsTotal,
  hasMoreReviews, sentimentFilter, searchText,
  fetchReviews, loadMoreReviews, changeSentimentFilter,
  setSearchText, changeSearchText,
} = useReviews();

const { menus, menusLoading, fetchMenus } = useMenus();
```

**Complexity**: 20+ state variables managing tabs, scroll, Socket, modals, reviews, menus

---

## 3. Tab System

### 3.1 Tab Types

```typescript
type TabType = 'menu' | 'review' | 'statistics' | 'map';
```

### 3.2 Tab Bar (Sticky)

```typescript
<View style={[styles.tabBar, { backgroundColor: colors.background }]}>
  <View style={styles.tabButtons}>
    <TouchableOpacity
      style={styles.tabButton}
      onPress={() => handleTabChange('menu')}
    >
      <Text style={[
        styles.tabButtonText,
        { color: activeTab === 'menu' ? colors.primary : colors.textSecondary }
      ]}>
        메뉴 ({menus.length})
      </Text>
      {activeTab === 'menu' && (
        <View style={[styles.tabIndicator, { backgroundColor: colors.primary }]} />
      )}
    </TouchableOpacity>

    {/* Similar for review, statistics, map tabs */}
  </View>

  {/* Sentiment filter (review tab only) */}
  {activeTab === 'review' && (
    <View style={styles.filterContainer}>
      {/* Filter buttons */}
    </View>
  )}
</View>
```

**Sticky Behavior**: `stickyHeaderIndices={[1]}` keeps tabs visible when scrolling

**Active Indicator**: Colored underline shows active tab

### 3.3 Tab Change Handler

```typescript
const handleTabChange = (tab: TabType) => {
  // Determine target scroll position
  const targetScrollY = currentScrollY.current >= headerHeight && headerHeight > 0
    ? headerHeight  // Keep header skipped
    : 0;  // Scroll to top

  setPendingScrollY(targetScrollY);
  setActiveTab(tab);
};

// Apply scroll after tab change
useEffect(() => {
  if (pendingScrollY !== null) {
    requestAnimationFrame(() => {
      scrollViewRef.current?.scrollTo({ y: pendingScrollY, animated: false });
      setPendingScrollY(null);
    });
  }
}, [activeTab, pendingScrollY]);
```

**Logic**: If header is already scrolled past, keep it scrolled past when switching tabs

**Why requestAnimationFrame?**: Ensures layout is complete before scrolling

---

## 4. Scroll Behavior

### 4.1 Snap-to Behavior

```typescript
<ScrollView
  ref={scrollViewRef}
  stickyHeaderIndices={[1]}  // Tab bar sticky
  snapToOffsets={headerHeight > 0 ? [0, headerHeight] : undefined}
  snapToEnd={false}
  decelerationRate="normal"
  onScroll={handleScroll}
  scrollEventThrottle={400}
>
```

**snapToOffsets**: Scroll snaps to:
1. `0` - Top (header fully visible)
2. `headerHeight` - After header (header fully hidden)

**Effect**: Smooth snap when user releases scroll

### 4.2 Header Height Measurement

```typescript
<View onLayout={(e) => {
  const newHeight = e.nativeEvent.layout.height;
  if (newHeight !== headerHeight) {
    setHeaderHeight(newHeight);
  }
}}>
  {/* Restaurant info + progress */}
</View>
```

**Purpose**: Measure header height for snap-to offsets

### 4.3 Infinite Scroll Handler

```typescript
const handleScroll = useCallback((event: any) => {
  const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;

  currentScrollY.current = contentOffset.y;

  const paddingToBottom = 100;
  const isNearBottom = contentOffset.y + layoutMeasurement.height >= contentSize.height - paddingToBottom;

  if (isNearBottom && activeTab === 'review' && !reviewsLoadingMore && !reviewsLoading && hasMoreReviews) {
    loadMoreReviews(restaurantId);
  }
}, [activeTab, restaurantId, reviewsLoadingMore, reviewsLoading, hasMoreReviews]);
```

**Trigger**: Load more when within 100px of bottom (review tab only)

---

## 5. Restaurant Header

### 5.1 Restaurant Info Card

```typescript
<View style={styles.restaurantInfoContainer}>
  <View style={[styles.restaurantInfoCard, {
    backgroundColor: theme === 'light' ? '#fff' : colors.surface,
    borderColor: colors.border
  }]}>
    <Text style={[styles.restaurantName, { color: colors.text }]}>
      {restaurant.name}
    </Text>
    {restaurant.category && (
      <Text style={[styles.restaurantCategory, { color: colors.textSecondary }]}>
        {restaurant.category}
      </Text>
    )}
    {restaurant.address && (
      <Text style={[styles.restaurantAddress, { color: colors.textSecondary }]}>
        {restaurant.address}
      </Text>
    )}
    <Text style={[styles.reviewCount, { color: colors.primary }]}>
      메뉴 {menus.length}개 · 리뷰 {reviewsTotal}개
    </Text>
  </View>
</View>
```

**Content**: Name, category, address, counts

---

## 6. Progress Display

### 6.1 Progress Section (Conditional)

```typescript
{isCrawling && (
  <View style={styles.crawlProgressContainer}>
    <View style={[styles.crawlProgressCard, {...}]}>
      <Text style={[styles.crawlProgressTitle, { color: colors.text }]}>
        🔄 크롤링 중...
      </Text>

      {menuProgress && menuProgress.total > 0 && (
        <View style={styles.progressSection}>
          {/* Menu progress bar */}
        </View>
      )}

      {crawlProgress && (
        <View style={styles.progressSection}>
          {/* Review progress bar */}
        </View>
      )}

      {imageProgress && (
        <View style={styles.progressSection}>
          {/* Image progress bar */}
        </View>
      )}

      {dbProgress && (
        <View style={styles.progressSection}>
          {/* DB progress bar */}
        </View>
      )}
    </View>
  </View>
)}
```

**Visibility**: Shows when any progress exists (`isCrawling = menuProgress !== null || ...`)

### 6.2 Progress Bar

```typescript
<View style={styles.progressSection}>
  <View style={styles.progressInfo}>
    <Text style={[styles.progressLabel, { color: colors.textSecondary }]}>
      리뷰 수집
    </Text>
    <Text style={[styles.progressText, { color: colors.text }]}>
      {crawlProgress.current} / {crawlProgress.total} ({crawlProgress.percentage}%)
    </Text>
  </View>
  <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
    <View
      style={[
        styles.progressBarFill,
        { backgroundColor: '#2196f3', width: `${crawlProgress.percentage}%` }
      ]}
    />
  </View>
</View>
```

**Colors**:
- Menu: Green (#4caf50)
- Review: Blue (#2196f3)
- Image: Orange (#ff9800)
- DB: Primary color

---

## 7. Menu Tab

### 7.1 Menu Grid

```typescript
{activeTab === 'menu' && (
  <View style={{ paddingHorizontal: 16 }}>
    {menusLoading ? (
      <ActivityIndicator size="small" color={colors.primary} />
    ) : menus.length > 0 ? (
      <View style={styles.menusGrid}>
        {menus.map((menu, index) => (
          <View key={index} style={[
            styles.menuCardContainer,
            theme === 'dark' ? styles.menuCardDark : styles.menuCardLight,
          ]}>
            <View style={styles.menuCardContent}>
              <View style={styles.menuInfo}>
                <Text style={[styles.menuName, { color: colors.text }]} numberOfLines={2}>
                  {menu.name}
                </Text>
                <Text style={[styles.menuPrice, { color: colors.primary, marginTop: 4 }]}>
                  {menu.price}
                </Text>
                {menu.description && (
                  <Text style={[styles.menuDescription, { color: colors.textSecondary }]} numberOfLines={2}>
                    {menu.description}
                  </Text>
                )}
              </View>
            </View>
            {menu.image && (
              <Image
                source={{ uri: `${getDefaultApiUrl()}${menu.image}` }}
                style={styles.menuImage}
                resizeMode="cover"
              />
            )}
          </View>
        ))}
      </View>
    ) : (
      <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
        등록된 메뉴가 없습니다
      </Text>
    )}
  </View>
)}
```

**Layout**: Vertical list of menu cards with image on right

---

## 8. Review Tab

### 8.1 Sentiment Filter

```typescript
{activeTab === 'review' && (
  <View style={styles.filterContainer}>
    <View style={styles.filterButtons}>
      <TouchableOpacity
        style={[
          styles.filterButton,
          {
            backgroundColor: sentimentFilter === 'all' ? colors.primary : (theme === 'light' ? '#f5f5f5' : colors.surface),
            borderColor: sentimentFilter === 'all' ? colors.primary : colors.border
          }
        ]}
        onPress={() => changeSentimentFilter(restaurantId, 'all')}
      >
        <Text style={[styles.filterButtonText, { color: sentimentFilter === 'all' ? '#fff' : colors.text }]}>
          전체
        </Text>
      </TouchableOpacity>

      {/* Similar for positive, negative, neutral */}
    </View>
  </View>
)}
```

**Options**:
- **전체** (All): Show all reviews
- **😊 긍정** (Positive): Green background
- **😞 부정** (Negative): Red background
- **😐 중립** (Neutral): Orange background

### 8.2 Search UI

```typescript
<View style={styles.searchContainer}>
  <View style={[styles.searchInputWrapper, {
    backgroundColor: theme === 'light' ? '#f5f5f5' : colors.surface,
    borderColor: colors.border
  }]}>
    <FontAwesomeIcon icon={faSearch} size={16} color={colors.textSecondary} style={{ marginRight: 8 }} />
    <TextInput
      style={[styles.searchInput, { color: colors.text }]}
      placeholder="리뷰 내용 검색..."
      placeholderTextColor={colors.textSecondary}
      value={searchText}
      onChangeText={setSearchText}
      onSubmitEditing={() => changeSearchText(restaurantId, searchText)}
      returnKeyType="search"
    />
    {searchText && searchText.length > 0 && (
      <TouchableOpacity onPress={() => {
        setSearchText('');
        changeSearchText(restaurantId, '');
      }}>
        <FontAwesomeIcon icon={faTimes} size={16} color={colors.textSecondary} />
      </TouchableOpacity>
    )}
  </View>
  <TouchableOpacity
    style={[styles.searchButton, { backgroundColor: colors.primary }]}
    onPress={() => changeSearchText(restaurantId, searchText)}
  >
    <Text style={styles.searchButtonText}>검색</Text>
  </TouchableOpacity>
</View>
```

**Features**:
- Search icon
- Clear button (when text entered)
- Submit on enter key
- Dedicated search button

### 8.3 Review Cards (with Skeleton Loading)

```typescript
{reviewsLoading && reviews.length === 0 ? (
  // Skeleton UI - 3 placeholder cards
  <View style={styles.reviewsList}>
    {[1, 2, 3].map((index) => (
      <View key={`skeleton-${index}`} style={[styles.reviewCardContainer, styles.skeletonCard]}>
        <View style={styles.reviewCardContent}>
          {/* Skeleton lines */}
          <View style={[styles.skeletonLine, styles.skeletonShort, { backgroundColor: colors.border }]} />
          <View style={[styles.skeletonLine, styles.skeletonTiny, { backgroundColor: colors.border }]} />
          <View style={[styles.skeletonLine, styles.skeletonFull, { backgroundColor: colors.border }]} />
        </View>
      </View>
    ))}
  </View>
) : reviews.length > 0 ? (
  // Actual review cards
  <View style={styles.reviewsList}>
    {reviews.map((review) => (
      <View key={review.id} style={[styles.reviewCardContainer]}>
        {/* Review content */}
      </View>
    ))}
  </View>
) : (
  <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
    검색 결과가 없습니다
  </Text>
)}
```

**Skeleton UI**: Shows 3 placeholder cards while loading

### 8.4 Review Card Structure

```typescript
<View style={styles.reviewCardContent}>
  {/* Header */}
  <View style={styles.reviewCardHeader}>
    <View style={{ flex: 1 }}>
      <Text style={[styles.reviewUserName, { color: colors.text }]}>
        {review.userName || '익명'}
      </Text>
      {review.visitInfo.visitDate && (
        <Text style={[styles.reviewDate, { color: colors.textSecondary }]}>
          {review.visitInfo.visitDate}
        </Text>
      )}
    </View>
    {/* Resummary button */}
    <TouchableOpacity
      style={styles.resummaryButton}
      onPress={() => openResummaryModal(review.id)}
    >
      <Text style={styles.resummaryButtonText}>🔄 재요약</Text>
    </TouchableOpacity>
  </View>

  {/* Visit keywords */}
  {review.visitKeywords.length > 0 && (
    <View style={styles.keywordsContainer}>
      {review.visitKeywords.map((keyword, idx) => (
        <View key={idx} style={[styles.keyword, { backgroundColor: colors.border }]}>
          <Text style={[styles.keywordText, { color: colors.text }]}>
            {keyword}
          </Text>
        </View>
      ))}
    </View>
  )}

  {/* Review text */}
  {review.reviewText && (
    <Text style={[styles.reviewText, { color: colors.text }]}>
      {review.reviewText}
    </Text>
  )}

  {/* Review images */}
  {review.images && review.images.length > 0 && (
    <View style={styles.reviewImagesContainer}>
      {/* Image display (single or scroll) */}
    </View>
  )}

  {/* AI Summary */}
  {review.summary && (
    <View style={styles.summaryContainer}>
      {/* AI summary content */}
    </View>
  )}
</View>
```

**Components**:
1. Header: User name, date, resummary button
2. Visit keywords: Chips
3. Review text
4. Images: Single full-width or horizontal scroll
5. AI Summary: Conditional rendering

### 8.5 Review Images

**Single Image**:
```typescript
{review.images.length === 1 ? (
  <TouchableOpacity onPress={() => handleImagePress(review.images, 0)}>
    <Image
      source={{ uri: `${getDefaultApiUrl()}${review.images[0]}` }}
      style={styles.reviewImageFull}
      resizeMode="cover"
    />
  </TouchableOpacity>
) : (
  // Horizontal scroll for multiple images
  <ScrollView
    horizontal
    showsHorizontalScrollIndicator={false}
  >
    {review.images.map((imageUrl, idx) => (
      <TouchableOpacity key={idx} onPress={() => handleImagePress(review.images, idx)}>
        <Image
          source={{ uri: `${getDefaultApiUrl()}${imageUrl}` }}
          style={styles.reviewImageScroll}
          resizeMode="cover"
        />
      </TouchableOpacity>
    ))}
  </ScrollView>
)}
```

**Layout**:
- **1 image**: Full-width (takes full card width)
- **Multiple**: Horizontal scrollable thumbnails

### 8.6 Image Viewer

```typescript
const handleImagePress = (images: string[], index: number) => {
  const fullUrls = images.map(img => `${getDefaultApiUrl()}${img}`);
  setImageViewerUrls(fullUrls);
  setImageViewerIndex(index);
  setImageViewerVisible(true);
};

<ImageViewing
  images={imageViewerUrls.map(uri => ({ uri }))}
  imageIndex={imageViewerIndex}
  visible={imageViewerVisible}
  onRequestClose={() => setImageViewerVisible(false)}
/>
```

**Library**: `react-native-image-viewing`

**Features**: Swipe between images, pinch to zoom, close button

---

## 9. AI Summary Display

### 9.1 Summary Container

```typescript
{review.summary && (
  <View style={[styles.summaryContainer, {
    backgroundColor: theme === 'light' ? '#f5f5ff' : '#1a1a2e',
    borderColor: theme === 'light' ? '#e0e0ff' : '#2d2d44'
  }]}>
    {/* Summary content */}
  </View>
)}
```

**Background**: Light purple (light mode), dark purple (dark mode)

### 9.2 Summary Header

```typescript
<View style={styles.summaryHeader}>
  <Text style={styles.summaryTitle}>🤖 AI 요약</Text>
  <View style={styles.sentimentBadge}>
    <Text style={[styles.sentimentText, {
      color: review.summary.sentiment === 'positive' ? '#4caf50' :
            review.summary.sentiment === 'negative' ? '#f44336' : '#ff9800'
    }]}>
      {review.summary.sentiment === 'positive' ? '😊 긍정' :
       review.summary.sentiment === 'negative' ? '😞 부정' : '😐 중립'}
    </Text>
  </View>
</View>
```

**Sentiment Badge**: Colored emoji + text (green/red/orange)

### 9.3 Summary Text

```typescript
<Text style={[styles.summaryText, { color: colors.text }]}>
  {review.summary.summary}
</Text>
```

**Content**: AI-generated summary of review

### 9.4 Key Keywords (Expandable)

```typescript
{review.summary.keyKeywords.length > 0 && (
  <View style={styles.summaryKeywords}>
    <TouchableOpacity
      style={styles.keywordsToggleButton}
      onPress={() => toggleKeywords(review.id)}
    >
      <Text style={[styles.summaryKeywordsTitle, { color: colors.textSecondary }]}>
        핵심 키워드 {expandedKeywords.has(review.id) ? '▼' : '▶'}
      </Text>
    </TouchableOpacity>

    {expandedKeywords.has(review.id) && (
      <View style={styles.keywordsContainer}>
        {review.summary.keyKeywords.map((keyword, idx) => (
          <View key={idx} style={styles.summaryKeyword}>
            <Text style={styles.summaryKeywordText}>{keyword}</Text>
          </View>
        ))}
      </View>
    )}
  </View>
)}
```

**Behavior**: Click to expand/collapse keywords

### 9.5 Satisfaction Score (Stars)

```typescript
{review.summary.satisfactionScore !== null && (
  <View style={styles.satisfactionScore}>
    <Text style={[styles.satisfactionLabel, { color: colors.textSecondary }]}>
      만족도:
    </Text>
    <View style={styles.scoreStars}>
      {renderStars(review.summary.satisfactionScore)}
      <Text style={[styles.scoreNumber, { color: colors.text }]}>
        {review.summary.satisfactionScore}점
      </Text>
    </View>
  </View>
)}
```

**renderStars Function**:
```typescript
const renderStars = (score: number) => {
  const normalizedScore = score / 20; // 0-100 → 0-5

  return [1, 2, 3, 4, 5].map((position) => {
    const diff = normalizedScore - position + 1;
    let icon: any;
    let color = '#ffc107'; // Gold

    if (diff >= 0.75) {
      icon = faStar; // Full star
    } else if (diff >= 0.25) {
      icon = faStarHalfStroke; // Half star
    } else {
      icon = farStar; // Empty star
      color = colors.border; // Gray
    }

    return (
      <FontAwesomeIcon
        key={position}
        icon={icon}
        size={16}
        color={color}
        style={{ marginRight: 2 }}
      />
    );
  });
};
```

**Conversion**: 0-100 score → 0-5 stars (with half-stars)

### 9.6 Menu Items

```typescript
{review.summary.menuItems && review.summary.menuItems.length > 0 && (
  <View style={styles.menuItemsSection}>
    <Text style={[styles.menuItemsTitle, { color: colors.textSecondary }]}>
      🍽️ 언급된 메뉴:
    </Text>
    <View style={styles.keywordsContainer}>
      {review.summary.menuItems.map((menuItem, idx) => {
        // Sentiment-based styling
        const sentimentConfig = {
          positive: { emoji: '😊', bgLight: '#c8e6c9', textLight: '#1b5e20', ... },
          negative: { emoji: '😞', bgLight: '#ffcdd2', textLight: '#b71c1c', ... },
          neutral: { emoji: '😐', bgLight: '#ffe0b2', textLight: '#e65100', ... }
        };

        const config = sentimentConfig[menuItem.sentiment || 'neutral'];

        return (
          <View key={idx} style={[styles.menuItem, {
            backgroundColor: theme === 'light' ? config.bgLight : config.bgDark,
            borderColor: theme === 'light' ? config.borderLight : config.borderDark
          }]}>
            <Text style={[styles.menuItemText, {
              color: theme === 'light' ? config.textLight : config.textDark
            }]}>
              {config.emoji} {menuItem.name}
            </Text>
          </View>
        );
      })}
    </View>
  </View>
)}
```

**Sentiment Styling**: Each menu item has emoji and color based on sentiment

---

## 10. Statistics Tab

### 10.1 Menu Statistics

```typescript
{activeTab === 'statistics' && (
  <View style={{ paddingHorizontal: 16 }}>
    {statisticsLoading ? (
      <ActivityIndicator size="small" color={colors.primary} />
    ) : menuStatistics ? (
      <View style={styles.statisticsContainer}>
        {/* Display statistics */}
      </View>
    ) : (
      <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
        통계 데이터가 없습니다
      </Text>
    )}
  </View>
)}
```

### 10.2 Fetch Statistics

```typescript
const fetchMenuStatistics = useCallback(async () => {
  setStatisticsLoading(true);
  try {
    const apiBaseUrl = getDefaultApiUrl();
    const response = await fetch(
      `${apiBaseUrl}/api/restaurants/${restaurantId}/menu-statistics?minMentions=1`
    );
    if (!response.ok) {
      console.error('❌ 메뉴 통계 조회 실패: HTTP', response.status);
      return;
    }
    const result = await response.json();
    if (result.result && result.data) {
      setMenuStatistics(result.data);
    }
  } catch (error) {
    console.error('❌ 메뉴 통계 조회 실패:', error);
    setMenuStatistics(null);
  } finally {
    setStatisticsLoading(false);
  }
}, [restaurantId]);
```

**API**: `/api/restaurants/:id/menu-statistics?minMentions=1`

**Lazy Loading**: Only fetches when tab is activated

---

## 11. Map Tab

### 11.1 Map Link

```typescript
{activeTab === 'map' && (
  <View style={{ paddingHorizontal: 16, paddingTop: 16 }}>
    <TouchableOpacity
      style={[styles.mapButton, { backgroundColor: colors.primary }]}
      onPress={() => openNaverMap(restaurant.placeId)}
    >
      <Text style={styles.mapButtonText}>🗺️ 네이버맵에서 보기</Text>
    </TouchableOpacity>
  </View>
)}
```

### 11.2 Open Naver Map

```typescript
const openNaverMap = useCallback(async (placeId: string) => {
  const appScheme = `nmap://place?id=${placeId}`;
  const webFallback = `https://m.place.naver.com/restaurant/${placeId}/location`;

  try {
    const canOpen = await Linking.canOpenURL(appScheme);

    if (canOpen) {
      // Open in Naver Map app
      await Linking.openURL(appScheme);
    } else {
      // Fallback to mobile web
      await Linking.openURL(webFallback);
    }
  } catch (error) {
    console.error('❌ 네이버맵 열기 실패:', error);
    // Error fallback to web
    Linking.openURL(webFallback);
  }
}, []);
```

**Deep Link**: Tries app first (`nmap://`), falls back to web

---

## 12. Socket.io Integration

### 12.1 Room Subscription

```typescript
useEffect(() => {
  const restaurantIdStr = String(restaurantId);

  // Join room
  joinRestaurantRoom(restaurantIdStr);

  // Set callbacks
  setRestaurantCallbacks({
    onMenuCrawlCompleted: async () => {
      await fetchMenus(restaurantId);
      if (activeTab === 'statistics') {
        await fetchMenuStatistics();
      }
    },
    onReviewCrawlCompleted: async () => {
      await fetchReviews(restaurantId, 0, false);
      if (activeTab === 'statistics') {
        await fetchMenuStatistics();
      }
    },
    onReviewSummaryCompleted: async () => {
      await fetchReviews(restaurantId, 0, false);
      if (activeTab === 'statistics') {
        await fetchMenuStatistics();
      }
    },
    onReviewCrawlError: async () => {
      await fetchReviews(restaurantId, 0, false);
    }
  });

  return () => {
    leaveRestaurantRoom(restaurantIdStr);
  };
}, [restaurantId]);
```

**Lifecycle**:
1. Join room on mount
2. Set callbacks for crawl completion
3. Leave room on unmount

### 12.2 Progress Reset

```typescript
// Reset crawl status 3s after completion
useEffect(() => {
  const wasCrawling = useRef(false);

  if (isCrawling) {
    wasCrawling.current = true;
  } else if (wasCrawling.current) {
    const timer = setTimeout(() => {
      resetCrawlStatus();
      wasCrawling.current = false;
    }, 3000);
    return () => clearTimeout(timer);
  }
}, [isCrawling, resetCrawlStatus]);
```

**Why 3s Delay?**: Give user time to see "Completed" state before clearing

---

## 13. Related Documentation

### Mobile Documentation
- **[MOBILE-RESTAURANT-LIST.md](./MOBILE-RESTAURANT-LIST.md)**: Restaurant list (navigation source)
- **[MOBILE-NAVIGATION.md](./MOBILE-NAVIGATION.md)**: Stack Navigator
- **[MOBILE-SETUP.md](./MOBILE-SETUP.md)**: Metro bundler

### Shared Documentation
- **[SHARED-HOOKS.md](../03-shared/SHARED-HOOKS.md)**: useReviews, useMenus hooks
- **[SHARED-CONTEXTS.md](../03-shared/SHARED-CONTEXTS.md)**: SocketContext
- **[SHARED-UTILS.md](../03-shared/SHARED-UTILS.md)**: Alert utility

### Web Comparison
- **[WEB-RESTAURANT.md](../01-web/WEB-RESTAURANT.md)**: Web restaurant detail (split-panel vs full-screen)

### Friendly Server Documentation
- **[FRIENDLY-RESTAURANT.md](../04-friendly/FRIENDLY-RESTAURANT.md)**: Restaurant API
- **[FRIENDLY-REVIEW.md](../04-friendly/FRIENDLY-REVIEW.md)**: Review API
- **[FRIENDLY-JOB-SOCKET.md](../04-friendly/FRIENDLY-JOB-SOCKET.md)**: Socket.io implementation

### Core Documentation
- **[ARCHITECTURE.md](../00-core/ARCHITECTURE.md)**: Overall architecture
- **[DEVELOPMENT.md](../00-core/DEVELOPMENT.md)**: Development workflow

---

## Appendix: Resummary Modal

### Modal UI

```typescript
<Modal
  visible={resummaryModalVisible}
  transparent
  animationType="fade"
  onRequestClose={closeResummaryModal}
>
  <View style={styles.modalOverlay}>
    <View style={[styles.modalContent, {
      backgroundColor: theme === 'light' ? '#fff' : colors.surface
    }]}>
      <Text style={[styles.modalTitle, { color: colors.text }]}>
        🔄 AI 재요약
      </Text>

      {/* Model selection */}
      {availableModels.map((model) => (
        <TouchableOpacity
          key={model.value}
          style={[
            styles.modelOption,
            {
              backgroundColor: selectedModel === model.value ? colors.primary : 'transparent',
              borderColor: selectedModel === model.value ? colors.primary : colors.border
            }
          ]}
          onPress={() => setSelectedModel(model.value)}
        >
          <Text style={[
            styles.modelOptionText,
            { color: selectedModel === model.value ? '#fff' : colors.text }
          ]}>
            {model.label}
          </Text>
        </TouchableOpacity>
      ))}

      <View style={styles.modalButtons}>
        <TouchableOpacity
          style={[styles.modalButton, styles.modalButtonCancel, { borderColor: colors.border }]}
          onPress={closeResummaryModal}
        >
          <Text style={[styles.modalButtonText, { color: colors.text }]}>취소</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.modalButton, styles.modalButtonConfirm, { backgroundColor: colors.primary }]}
          onPress={handleResummarize}
          disabled={resummaryLoading}
        >
          {resummaryLoading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={[styles.modalButtonText, { color: '#fff' }]}>재요약</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  </View>
</Modal>
```

### Available Models

```typescript
const availableModels = [
  { value: 'gpt-oss:20b-cloud', label: 'GPT OSS 20B (Cloud)' },
  { value: 'gpt-oss:120b-cloud', label: 'GPT OSS 120B (Cloud)' },
  { value: 'deepseek-v3.1:671b-cloud', label: 'DeepSeek v3.1 671B (Cloud)' },
];
```

### Resummary API Call

```typescript
const handleResummarize = async () => {
  if (!selectedReviewId) return;

  setResummaryLoading(true);
  try {
    const apiBaseUrl = getDefaultApiUrl();
    const response = await fetch(`${apiBaseUrl}/api/reviews/summarize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        reviewId: selectedReviewId,
        useCloud: true,
        config: { model: selectedModel }
      })
    });

    if (!response.ok) {
      Alert.error('재요약 실패', '재요약 요청에 실패했습니다.');
      return;
    }

    await fetchReviews(restaurantId);
    closeResummaryModal();
  } catch (error) {
    Alert.error('오류', '재요약에 실패했습니다.');
  } finally {
    setResummaryLoading(false);
  }
};
```

---

## Appendix: Performance Considerations

### Refs for Latest Values

```typescript
const activeTabRef = useRef(activeTab);
const fetchReviewsRef = useRef(fetchReviews);
const fetchMenusRef = useRef(fetchMenus);

useEffect(() => {
  activeTabRef.current = activeTab;
  fetchReviewsRef.current = fetchReviews;
  fetchMenusRef.current = fetchMenus;
});
```

**Why?**: Socket callbacks need latest values without recreating callbacks

### Scroll Event Throttling

```typescript
scrollEventThrottle={400}
```

**Purpose**: Reduce scroll event frequency (every 400ms)

### Conditional Tab Rendering

Only active tab content is rendered, reducing memory usage.

---

**Document Version**: 1.0.0
**Covers Files**: `RestaurantDetailScreen.tsx` (2156 lines), complex scroll behavior, Socket.io integration
