# Shared React Hooks

> **Last Updated**: 2025-10-23
> **Purpose**: Cross-platform React hooks for authentication, data fetching, and business logic

---

## 목차

1. [useAuth](#1-useauth)
2. [useLogin](#2-uselogin)
3. [useMenus](#3-usemenus)
4. [useReviews](#4-usereviews)
5. [useRestaurantList](#5-userestaurantlist)
6. [Related Documentation](#6-related-documentation)

---

## 1. useAuth

**Location**: `apps/shared/hooks/useAuth.ts`

### 1.1 Overview

Global authentication state management hook with automatic storage persistence and session restoration.

### 1.2 Hook Signature

```typescript
export interface AuthHookReturn {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (user: User, token?: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
}

export const useAuth = (): AuthHookReturn
```

### 1.3 Return Values

| Property | Type | Description |
|----------|------|-------------|
| `user` | `User \| null` | Current user object or null if not authenticated |
| `isAuthenticated` | `boolean` | True if user is logged in (`!!user`) |
| `isLoading` | `boolean` | True during initial auth check (on mount) |
| `login` | `Function` | Store user and token, update state |
| `logout` | `Function` | Clear user data from storage, update state |
| `checkAuth` | `Function` | Manually trigger auth check |

### 1.4 Implementation Details

#### 1.4.1 Initial Auth Check (Auto-restore)

```typescript
useEffect(() => {
  checkAuth();
}, []);

const checkAuth = async () => {
  try {
    setIsLoading(true);
    const savedUser = await storage.getUserInfo<User>();

    if (savedUser) {
      setUser(savedUser);
    }
  } catch (error) {
    console.error('Failed to check auth:', error);
  } finally {
    setIsLoading(false);
  }
};
```

**Behavior**:
- Automatically runs on component mount
- Loads saved user from storage (`user_info` key)
- Sets `isLoading` to `false` after check completes

#### 1.4.2 Login

```typescript
const login = async (user: User, token?: string) => {
  try {
    await storage.setUserInfo(user);

    if (token) {
      await storage.setAuthToken(token);
    }

    setUser(user);
  } catch (error) {
    console.error('Failed to login:', error);
    throw error;
  }
};
```

**Flow**:
1. Save user object to storage (`user_info` key)
2. Save JWT token if provided (`auth_token` key)
3. Update React state (`user`)
4. Throw error if storage operation fails

#### 1.4.3 Logout

```typescript
const logout = async () => {
  try {
    await storage.logout();
    setUser(null);
  } catch (error) {
    console.error('Failed to logout:', error);
    throw error;
  }
};
```

**Flow**:
1. Call `storage.logout()` (clears `user_info` and `auth_token`)
2. Update React state to `null`
3. Throw error if storage operation fails

### 1.5 Usage Example

```typescript
import { useAuth } from '@shared/hooks'

function App() {
  const { user, isAuthenticated, isLoading, login, logout } = useAuth()

  // Show loading spinner during initial auth check
  if (isLoading) {
    return <LoadingSpinner />
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return <LoginScreen />
  }

  // Show authenticated app
  return (
    <View>
      <Text>Welcome, {user?.username}!</Text>
      <Button onPress={logout} title="Logout" />
    </View>
  )
}
```

### 1.6 Integration with useLogin

```typescript
import { useAuth } from '@shared/hooks'
import { useLogin } from '@shared/hooks'

function LoginScreen() {
  const { login } = useAuth()
  const { email, setEmail, password, setPassword, handleLogin } = useLogin()

  const onLoginSuccess = async () => {
    // Fetch user info from API response
    const response = await apiService.login({ email, password })
    if (response.result && response.data?.user) {
      await login(response.data.user, response.data.token)
    }
  }

  return (
    <View>
      <TextInput value={email} onChangeText={setEmail} />
      <TextInput value={password} onChangeText={setPassword} secureTextEntry />
      <Button onPress={() => handleLogin(onLoginSuccess)} title="Login" />
    </View>
  )
}
```

---

## 2. useLogin

**Location**: `apps/shared/hooks/useLogin.ts`

### 2.1 Overview

Login form state management and API integration hook with built-in validation and error handling.

### 2.2 Hook Signature

```typescript
export interface LoginHookReturn {
  email: string;
  setEmail: (email: string) => void;
  password: string;
  setPassword: (password: string) => void;
  isLoading: boolean;
  handleLogin: (onSuccess?: () => void) => void;
  handleForgotPassword: () => void;
  handleSignUp: () => void;
}

export const useLogin = (): LoginHookReturn
```

### 2.3 Return Values

| Property | Type | Description |
|----------|------|-------------|
| `email` | `string` | Email input value (default: `'niney@ks.com'`) |
| `setEmail` | `Function` | Update email value |
| `password` | `string` | Password input value (default: `'tester'`) |
| `setPassword` | `Function` | Update password value |
| `isLoading` | `boolean` | True during API call |
| `handleLogin` | `Function` | Login API call with optional success callback |
| `handleForgotPassword` | `Function` | Show forgot password message |
| `handleSignUp` | `Function` | Show sign up message |

### 2.4 Implementation Details

#### 2.4.1 Default Values

```typescript
const [email, setEmail] = useState('niney@ks.com');
const [password, setPassword] = useState('tester');
```

**Note**: Pre-filled with test account credentials for development.

#### 2.4.2 Login Handler

```typescript
const handleLogin = async (onSuccess?: () => void) => {
  // Validation
  if (!email || !password) {
    Alert.error(AUTH_CONSTANTS.ERRORS.errorTitle, AUTH_CONSTANTS.ERRORS.emptyFields);
    return;
  }

  setIsLoading(true);

  try {
    // API call
    const response = await apiService.login({ email, password });

    if (response.result) {
      // Save user info
      if (response.data?.user) {
        await storage.setUserInfo(response.data.user);
        console.log('Logged in user:', response.data.user);
      }

      // Save JWT token (future implementation)
      if (response.data?.token) {
        await storage.setAuthToken(response.data.token);
      }

      // Trigger success callback
      if (onSuccess) {
        onSuccess();
      }
    }
  } catch (error: any) {
    console.error('Login failed:', error);
    Alert.error(
      AUTH_CONSTANTS.ERRORS.errorTitle,
      error.message || '로그인에 실패했습니다. 이메일과 비밀번호를 확인해주세요.'
    );
  } finally {
    setIsLoading(false);
  }
};
```

**Flow**:
1. Validate inputs (show alert if empty)
2. Set `isLoading = true`
3. Call `apiService.login()` with email and password
4. Save user and token to storage if successful
5. Call `onSuccess` callback
6. Show error alert if API call fails
7. Set `isLoading = false`

#### 2.4.3 Forgot Password

```typescript
const handleForgotPassword = () => {
  Alert.show(
    AUTH_CONSTANTS.MESSAGES.forgotPasswordTitle,
    AUTH_CONSTANTS.MESSAGES.forgotPasswordMessage
  );
};
```

**Behavior**: Shows alert with forgot password message (placeholder for future implementation).

#### 2.4.4 Sign Up

```typescript
const handleSignUp = () => {
  Alert.show(AUTH_CONSTANTS.MESSAGES.signUpTitle, AUTH_CONSTANTS.MESSAGES.signUpMessage);
};
```

**Behavior**: Shows alert with sign up message (placeholder for future implementation).

### 2.5 Usage Example

```typescript
import { useLogin } from '@shared/hooks'

function LoginForm() {
  const {
    email,
    setEmail,
    password,
    setPassword,
    isLoading,
    handleLogin,
    handleForgotPassword,
    handleSignUp
  } = useLogin()

  return (
    <View>
      <TextInput
        value={email}
        onChangeText={setEmail}
        placeholder="Email"
        autoCapitalize="none"
        keyboardType="email-address"
      />

      <TextInput
        value={password}
        onChangeText={setPassword}
        placeholder="Password"
        secureTextEntry
      />

      <Button
        onPress={() => handleLogin(() => console.log('Login success'))}
        title={isLoading ? 'Logging in...' : 'Login'}
        disabled={isLoading}
      />

      <Pressable onPress={handleForgotPassword}>
        <Text>Forgot Password?</Text>
      </Pressable>

      <Pressable onPress={handleSignUp}>
        <Text>Sign Up</Text>
      </Pressable>
    </View>
  )
}
```

---

## 3. useMenus

**Location**: `apps/shared/hooks/useMenus.ts`

### 3.1 Overview

Menu data fetching and management hook for restaurant menus.

### 3.2 Hook Signature

```typescript
export const useMenus = () => {
  return {
    menus: MenuItem[];
    menusLoading: boolean;
    fetchMenus: (restaurantId: number) => Promise<void>;
    clearMenus: () => void;
  }
}

export type MenusHookReturn = ReturnType<typeof useMenus>
```

### 3.3 Return Values

| Property | Type | Description |
|----------|------|-------------|
| `menus` | `MenuItem[]` | Array of menu items |
| `menusLoading` | `boolean` | True during API call |
| `fetchMenus` | `Function` | Fetch menus for a restaurant |
| `clearMenus` | `Function` | Clear menus array |

### 3.4 Implementation

```typescript
export const useMenus = () => {
  const [menus, setMenus] = useState<MenuItem[]>([])
  const [menusLoading, setMenusLoading] = useState(false)

  const fetchMenus = async (restaurantId: number) => {
    setMenusLoading(true)
    try {
      const response = await apiService.getRestaurantById(restaurantId)
      if (response.result && response.data) {
        setMenus(response.data.menus || [])
      }
    } catch (err) {
      console.error('메뉴 조회 실패:', err)
      Alert.error('조회 실패', '메뉴를 불러오는데 실패했습니다')
    } finally {
      setMenusLoading(false)
    }
  }

  const clearMenus = () => {
    setMenus([])
  }

  return {
    menus,
    menusLoading,
    fetchMenus,
    clearMenus,
  }
}
```

### 3.5 Usage Example

```typescript
import { useMenus } from '@shared/hooks'

function RestaurantDetail({ restaurantId }: { restaurantId: number }) {
  const { menus, menusLoading, fetchMenus, clearMenus } = useMenus()

  useEffect(() => {
    fetchMenus(restaurantId)
    return () => clearMenus()
  }, [restaurantId])

  if (menusLoading) {
    return <LoadingSpinner />
  }

  return (
    <ScrollView>
      <Text>Menus ({menus.length})</Text>
      {menus.map(menu => (
        <View key={menu.id}>
          <Text>{menu.name}</Text>
          <Text>{menu.price}</Text>
          {menu.image && <Image source={{ uri: menu.image }} />}
        </View>
      ))}
    </ScrollView>
  )
}
```

---

## 4. useReviews

**Location**: `apps/shared/hooks/useReviews.ts`

### 4.1 Overview

Review data fetching hook with infinite scroll, sentiment filtering, and search functionality.

### 4.2 Hook Signature

```typescript
export type SentimentFilter = 'all' | 'positive' | 'negative' | 'neutral'

export const useReviews = () => {
  return {
    reviews: ReviewData[];
    reviewsLoading: boolean;
    reviewsLoadingMore: boolean;
    reviewsTotal: number;
    reviewsOffset: number;
    hasMoreReviews: boolean;
    sentimentFilter: SentimentFilter;
    searchText: string;
    fetchReviews: (restaurantId: number, offset?: number, append?: boolean) => Promise<void>;
    loadMoreReviews: (restaurantId: number) => Promise<void>;
    clearReviews: () => void;
    changeSentimentFilter: (restaurantId: number, filter: SentimentFilter) => Promise<void>;
    setSearchText: (text: string) => void;
    changeSearchText: (restaurantId: number, text: string) => Promise<void>;
  }
}

export type ReviewsHookReturn = ReturnType<typeof useReviews>
```

### 4.3 Key Features

#### 4.3.1 Infinite Scroll

```typescript
const fetchReviews = async (restaurantId: number, offset: number = 0, append: boolean = false) => {
  // First load: 3 reviews, subsequent loads: 10 reviews
  const reviewsLimit = offset === 0 ? 3 : 10;

  // Duplicate request prevention
  if (fetchingOffsetRef.current === offset) {
    console.log(`⚠️ Duplicate request prevented: offset ${offset}`)
    return
  }

  fetchingOffsetRef.current = offset

  if (append) {
    setReviewsLoadingMore(true)
  } else {
    setReviewsLoading(true)
  }

  try {
    const sentiments = sentimentFilter === 'all' ? undefined : [sentimentFilter]
    const response = await apiService.getReviewsByRestaurantId(
      restaurantId,
      reviewsLimit,
      offset,
      sentiments,
      searchText || undefined
    )

    if (response.result && response.data) {
      const newReviews = response.data.reviews

      if (append) {
        // Deduplicate reviews by ID
        setReviews(prev => {
          const existingIds = new Set(prev.map(r => r.id))
          const uniqueNewReviews = newReviews.filter(r => !existingIds.has(r.id))

          if (uniqueNewReviews.length < newReviews.length) {
            console.log(`⚠️ Duplicate reviews removed: ${newReviews.length - uniqueNewReviews.length}`)
          }

          return [...prev, ...uniqueNewReviews]
        })
      } else {
        setReviews(newReviews)
      }

      setReviewsTotal(response.data.total)
      setReviewsOffset(offset + newReviews.length)

      const totalLoaded = append ? reviews.length + newReviews.length : newReviews.length
      const hasMore = totalLoaded < response.data.total
      setHasMoreReviews(hasMore)
    }
  } catch (err) {
    console.error('리뷰 조회 실패:', err)
    Alert.error('조회 실패', '리뷰를 불러오는데 실패했습니다')
  } finally {
    setReviewsLoading(false)
    setReviewsLoadingMore(false)
    fetchingOffsetRef.current = null
  }
}
```

**Features**:
- First load: 3 reviews
- Subsequent loads: 10 reviews per page
- Duplicate request prevention with `fetchingOffsetRef`
- Automatic deduplication by review ID
- Tracks `hasMoreReviews` to stop infinite scroll

#### 4.3.2 Load More

```typescript
const loadMoreReviews = async (restaurantId: number) => {
  if (!hasMoreReviews || reviewsLoadingMore || reviewsLoading) return

  const nextOffset = reviews.length
  await fetchReviews(restaurantId, nextOffset, true)
}
```

**Behavior**:
- Check if more reviews available
- Prevent duplicate calls during loading
- Calculate next offset based on current reviews length
- Append new reviews to existing array

#### 4.3.3 Sentiment Filtering

```typescript
const changeSentimentFilter = async (restaurantId: number, filter: SentimentFilter) => {
  setSentimentFilter(filter)
  clearReviews()

  const sentiments = filter === 'all' ? undefined : [filter]

  setReviewsLoading(true)
  try {
    const response = await apiService.getReviewsByRestaurantId(
      restaurantId,
      3,
      0,
      sentiments,
      searchText || undefined
    )
    if (response.result && response.data) {
      setReviews(response.data.reviews)
      setReviewsTotal(response.data.total)
      setReviewsOffset(response.data.reviews.length)
      const hasMore = response.data.reviews.length < response.data.total
      setHasMoreReviews(hasMore)
    }
  } catch (err) {
    console.error('리뷰 조회 실패:', err)
    Alert.error('조회 실패', '리뷰를 불러오는데 실패했습니다')
  } finally {
    setReviewsLoading(false)
  }
}
```

**Flow**:
1. Update sentiment filter state
2. Clear existing reviews
3. Fetch new reviews with filter applied
4. Reset to first page (offset = 0, limit = 3)

#### 4.3.4 Search

```typescript
const changeSearchText = async (restaurantId: number, text: string) => {
  setSearchText(text)
  clearReviews()

  const sentiments = sentimentFilter === 'all' ? undefined : [sentimentFilter]

  setReviewsLoading(true)
  try {
    const response = await apiService.getReviewsByRestaurantId(
      restaurantId,
      3,
      0,
      sentiments,
      text || undefined
    )
    // ... (same as changeSentimentFilter)
  } finally {
    setReviewsLoading(false)
  }
}
```

**Flow**: Similar to sentiment filter - clears reviews and fetches from beginning with search query.

### 4.4 Usage Example

```typescript
import { useReviews } from '@shared/hooks'

function ReviewList({ restaurantId }: { restaurantId: number }) {
  const {
    reviews,
    reviewsLoading,
    reviewsLoadingMore,
    reviewsTotal,
    hasMoreReviews,
    sentimentFilter,
    searchText,
    fetchReviews,
    loadMoreReviews,
    clearReviews,
    changeSentimentFilter,
    changeSearchText
  } = useReviews()

  useEffect(() => {
    fetchReviews(restaurantId)
    return () => clearReviews()
  }, [restaurantId])

  const handleEndReached = () => {
    if (hasMoreReviews && !reviewsLoadingMore && !reviewsLoading) {
      loadMoreReviews(restaurantId)
    }
  }

  return (
    <View>
      <TextInput
        value={searchText}
        onChangeText={(text) => changeSearchText(restaurantId, text)}
        placeholder="Search reviews..."
      />

      <View style={{ flexDirection: 'row' }}>
        {['all', 'positive', 'negative', 'neutral'].map(filter => (
          <Pressable
            key={filter}
            onPress={() => changeSentimentFilter(restaurantId, filter as SentimentFilter)}
          >
            <Text style={{ fontWeight: sentimentFilter === filter ? 'bold' : 'normal' }}>
              {filter}
            </Text>
          </Pressable>
        ))}
      </View>

      <Text>Total: {reviewsTotal} reviews</Text>

      {reviewsLoading && <LoadingSpinner />}

      <FlatList
        data={reviews}
        renderItem={({ item }) => (
          <View>
            <Text>{item.user_name}</Text>
            <Text>{item.review_text}</Text>
          </View>
        )}
        onEndReached={handleEndReached}
        onEndReachedThreshold={0.5}
        ListFooterComponent={reviewsLoadingMore ? <LoadingSpinner /> : null}
      />
    </View>
  )
}
```

---

## 5. useRestaurantList

**Location**: `apps/shared/hooks/useRestaurantList.ts`

### 5.1 Overview

Restaurant list management hook with category filtering, crawling, and platform-independent navigation callbacks.

### 5.2 Hook Signature

```typescript
export interface RestaurantListHookOptions {
  onCrawlSuccess?: (restaurant: RestaurantData | null) => void
  onCrawlError?: (error: string) => void
}

export const useRestaurantList = (options?: RestaurantListHookOptions) => {
  return {
    url: string;
    setUrl: (url: string) => void;
    loading: boolean;
    categories: RestaurantCategory[];
    categoriesLoading: boolean;
    restaurants: RestaurantData[];
    restaurantsLoading: boolean;
    total: number;
    selectedCategory: string | null;
    setSelectedCategory: (category: string | null) => void;
    handleCrawl: () => Promise<void>;
    fetchRestaurants: (limit?: number, offset?: number) => Promise<RestaurantData[]>;
    fetchCategories: () => Promise<void>;
  }
}

export type RestaurantListHookReturn = ReturnType<typeof useRestaurantList>
```

### 5.3 Key Features

#### 5.3.1 Category Fetching

```typescript
const fetchCategories = async () => {
  setCategoriesLoading(true)
  try {
    const response = await apiService.getRestaurantCategories()
    if (response.result && response.data) {
      setCategories(response.data)
    }
  } catch (err) {
    console.error('카테고리 조회 실패:', err)
  } finally {
    setCategoriesLoading(false)
  }
}

useEffect(() => {
  fetchCategories()
}, [])
```

**Behavior**: Auto-fetches categories on mount.

#### 5.3.2 Restaurant Fetching with Category Filter

```typescript
const fetchRestaurants = async (limit: number = 100, offset: number = 0) => {
  setRestaurantsLoading(true)
  try {
    const response = await apiService.getRestaurants(
      limit,
      offset,
      selectedCategory || undefined
    )
    if (response.result && response.data) {
      setRestaurants(response.data.restaurants)
      setTotal(response.data.total)
      return response.data.restaurants
    }
  } catch (err) {
    console.error('레스토랑 조회 실패:', err)
  } finally {
    setRestaurantsLoading(false)
  }
  return []
}

useEffect(() => {
  fetchRestaurants()
}, [selectedCategory])
```

**Behavior**: Auto-refetches restaurants when category changes.

#### 5.3.3 Restaurant Crawling

```typescript
const handleCrawl = async () => {
  if (!url.trim()) {
    Alert.error('오류', 'URL을 입력해주세요')
    return
  }

  setLoading(true)

  try {
    const response = await apiService.crawlRestaurant({
      url: url.trim(),
      crawlMenus: true,
      crawlReviews: true,
      createSummary: true // Auto-create review summary after crawling
    })

    if (response.result && response.data) {
      const restaurantId = response.data.restaurantId

      // Refresh lists
      const updatedRestaurants = await fetchRestaurants()
      await fetchCategories()

      // Clear URL on success
      setUrl('')

      if (restaurantId) {
        // Find newly crawled restaurant
        const newRestaurant = updatedRestaurants.find(r => r.id === restaurantId) || null

        // Trigger success callback (platform-specific navigation)
        options?.onCrawlSuccess?.(newRestaurant)
      } else {
        options?.onCrawlSuccess?.(null)
      }
    } else {
      await fetchRestaurants()
      await fetchCategories()
    }
  } catch (err: any) {
    const errorMessage = err.response?.data?.message || err.message || '크롤링 중 오류가 발생했습니다'
    Alert.error('크롤링 실패', errorMessage)
    options?.onCrawlError?.(errorMessage)
  } finally {
    setLoading(false)
  }
}
```

**Flow**:
1. Validate URL (show alert if empty)
2. Call crawl API with options (menus, reviews, summary)
3. Refresh restaurant list and categories
4. Clear URL input on success
5. Find newly crawled restaurant by ID
6. Call `onCrawlSuccess` callback with restaurant data
7. Handle errors with alert and `onCrawlError` callback

### 5.4 Usage Example

```typescript
import { useRestaurantList } from '@shared/hooks'
import { useNavigation } from '@react-navigation/native'

function RestaurantListScreen() {
  const navigation = useNavigation()

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
    handleCrawl,
  } = useRestaurantList({
    onCrawlSuccess: (restaurant) => {
      if (restaurant) {
        navigation.navigate('RestaurantDetail', { restaurantId: restaurant.id })
      }
    },
    onCrawlError: (error) => {
      console.error('Crawl failed:', error)
    }
  })

  return (
    <View>
      <TextInput
        value={url}
        onChangeText={setUrl}
        placeholder="Naver Map URL"
      />
      <Button onPress={handleCrawl} title={loading ? 'Crawling...' : 'Crawl'} disabled={loading} />

      <ScrollView horizontal>
        <Pressable onPress={() => setSelectedCategory(null)}>
          <Text style={{ fontWeight: !selectedCategory ? 'bold' : 'normal' }}>All</Text>
        </Pressable>
        {categories.map(cat => (
          <Pressable key={cat.category} onPress={() => setSelectedCategory(cat.category)}>
            <Text style={{ fontWeight: selectedCategory === cat.category ? 'bold' : 'normal' }}>
              {cat.category} ({cat.count})
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {restaurantsLoading && <LoadingSpinner />}

      <FlatList
        data={restaurants}
        renderItem={({ item }) => (
          <Pressable onPress={() => navigation.navigate('RestaurantDetail', { restaurantId: item.id })}>
            <Text>{item.name}</Text>
            <Text>{item.category}</Text>
          </Pressable>
        )}
      />
    </View>
  )
}
```

---

## 6. Related Documentation

### 6.1 Shared Module Documentation
- **[Shared Contexts](./SHARED-CONTEXTS.md)** - ThemeContext, SocketContext
- **[Shared Utils](./SHARED-UTILS.md)** - Alert, Storage, Socket utils
- **[Shared Services](./SHARED-SERVICES.md)** - API service layer
- **[Shared Constants](./SHARED-CONSTANTS.md)** - AUTH_CONSTANTS, APP_INFO_CONSTANTS
- **[Shared Overview](./SHARED-OVERVIEW.md)** - Barrel Export pattern

### 6.2 Backend Documentation
- **[Friendly Auth](../04-friendly/FRIENDLY-AUTH.md)** - Backend authentication API

### 6.3 Web/Mobile Documentation
- **[Web Login](../01-web/WEB-LOGIN.md)** - Web login component using useLogin
- **[Mobile Login](../02-mobile/MOBILE-LOGIN.md)** - Mobile login screen using useLogin
- **[Web Restaurant](../01-web/WEB-RESTAURANT.md)** - Web restaurant component using hooks
- **[Mobile Restaurant Detail](../02-mobile/MOBILE-RESTAURANT-DETAIL.md)** - Mobile detail screen using hooks

---

**문서 버전**: 1.0
**작성일**: 2025-10-23
**관리**: Claude Code Documentation Team
