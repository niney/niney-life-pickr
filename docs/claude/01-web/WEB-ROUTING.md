# WEB-ROUTING.md

> **Last Updated**: 2025-10-23 21:15
> **Purpose**: React Router configuration, protected routes, and navigation patterns

---

## Table of Contents

1. [Overview](#1-overview)
2. [Router Configuration](#2-router-configuration)
3. [Protected Routes](#3-protected-routes)
4. [Route Definitions](#4-route-definitions)
5. [Authentication Flow](#5-authentication-flow)
6. [Navigation Patterns](#6-navigation-patterns)
7. [URL State Management](#7-url-state-management)
8. [Common Patterns](#8-common-patterns)
9. [Related Documentation](#9-related-documentation)

---

## 1. Overview

The web application uses **React Router DOM 7.9.3** for client-side routing with authentication-based protected routes. The routing system automatically redirects unauthenticated users to login and preserves the original URL for post-login redirection.

### Key Features
- **Auth-based Route Protection**: Conditional rendering based on authentication state
- **URL Preservation**: Saves original URL for post-login redirect
- **Loading States**: Shows loading screen during auth check
- **Centralized Routing**: All routes defined in App.tsx
- **Nested Routes**: Support for nested route structures (e.g., `/restaurant/*`)

### Dependencies
- **react-router-dom**: ^7.9.3
- **@shared/hooks**: useAuth hook for authentication state

---

## 2. Router Configuration

### 2.1 File: `App.tsx`

**Location**: `apps/web/src/App.tsx`

The entire routing system is defined in a single file with three main components:
1. **App**: Root component with context providers
2. **AppContent**: Main routing logic with auth-based conditional rendering
3. **RedirectToLogin**: Helper component for URL preservation

### 2.2 Context Providers

```typescript
function App() {
  return (
    <ThemeProvider>
      <SocketProvider>
        <AppContent />
      </SocketProvider>
    </ThemeProvider>
  )
}
```

**Provider Order**:
1. **ThemeProvider**: Theme management (light/dark mode)
2. **SocketProvider**: Socket.io real-time communication
3. **AppContent**: Routing logic

**Why This Order?**
- ThemeProvider is outermost (global theme state)
- SocketProvider requires theme context for connection status UI
- AppContent (with BrowserRouter) is innermost to access all contexts

---

## 3. Protected Routes

### 3.1 Authentication State Management

```typescript
function AppContent() {
  const { isAuthenticated, isLoading, logout, checkAuth } = useAuth()

  const handleLoginSuccess = async () => {
    // Re-check auth state after login
    await checkAuth()
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="page-container" style={{
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#fff'
      }}>
        <div>Loading...</div>
      </div>
    )
  }

  // Routes rendered after loading completes...
}
```

**Auth States**:
- **isLoading**: `true` during initial auth check (shows loading screen)
- **isAuthenticated**: `true` if user has valid session
- **checkAuth**: Re-checks auth state (called after login)

### 3.2 Conditional Route Rendering

```typescript
return (
  <BrowserRouter>
    <Routes>
      {!isAuthenticated ? (
        <>
          <Route path="/login" element={<Login onLoginSuccess={handleLoginSuccess} />} />
          <Route path="*" element={<RedirectToLogin />} />
        </>
      ) : (
        <>
          <Route path="/" element={<Home onLogout={logout} />} />
          <Route path="/restaurant/*" element={<Restaurant onLogout={logout} />} />
          <Route path="/login" element={<Navigate to="/" replace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </>
      )}
    </Routes>
  </BrowserRouter>
)
```

**Pattern**:
- **Unauthenticated**: Only `/login` accessible, all other paths redirect to login
- **Authenticated**: App routes accessible, `/login` redirects to home

**Benefits**:
- No need for HOC (Higher-Order Component) wrappers
- Clear separation of public vs. protected routes
- Easy to add new routes to either group

---

## 4. Route Definitions

### 4.1 Public Routes (Unauthenticated)

| Path | Component | Description |
|------|-----------|-------------|
| `/login` | `<Login />` | Login page |
| `*` | `<RedirectToLogin />` | Catch-all redirect to login |

**Behavior**:
- `/login`: Shows login form
- Any other path: Saves URL to sessionStorage, redirects to `/login`

### 4.2 Protected Routes (Authenticated)

| Path | Component | Description |
|------|-----------|-------------|
| `/` | `<Home />` | Home screen with restaurant list |
| `/restaurant/*` | `<Restaurant />` | Restaurant detail (nested routes) |
| `/login` | `<Navigate to="/" />` | Redirect to home if already logged in |
| `*` | `<Navigate to="/" />` | Catch-all redirect to home |

**Nested Routes**:
- `/restaurant/*` uses wildcard to support nested routing within Restaurant component
- Enables `/restaurant/:placeId` pattern without explicit parent route definition

### 4.3 Route Components

All route components receive `onLogout` prop:

```typescript
interface RouteComponentProps {
  onLogout: () => void | Promise<void>
}

// Usage
<Route path="/" element={<Home onLogout={logout} />} />
```

**Purpose**: Allow components to trigger logout (e.g., from header menu)

---

## 5. Authentication Flow

### 5.1 Initial Load

```
1. App renders → ThemeProvider + SocketProvider
2. AppContent renders → useAuth() hook runs
3. useAuth checks storage for existing session
4. isLoading = true (shows loading screen)
5. Auth check completes:
   - If session found: isAuthenticated = true, show app routes
   - If no session: isAuthenticated = false, show login route
```

### 5.2 Login Flow

```
1. User visits any URL (e.g., /restaurant/abc123)
2. Not authenticated → RedirectToLogin saves URL to sessionStorage
3. User redirected to /login
4. User enters credentials and submits
5. Login component calls onLoginSuccess callback
6. AppContent calls checkAuth() to update state
7. isAuthenticated becomes true
8. Login component checks sessionStorage for saved URL
9. If saved URL exists:
   - Navigate to saved URL
   - Clear sessionStorage
10. If no saved URL:
    - Stay on home page (/)
```

**Implementation** (in Login component):
```typescript
const handleLoginSuccess = async () => {
  await checkAuth()  // Update auth state

  // Check for saved redirect URL
  const redirectUrl = sessionStorage.getItem('redirectUrl')
  if (redirectUrl) {
    sessionStorage.removeItem('redirectUrl')
    navigate(redirectUrl)
  }
  // Otherwise, React Router automatically navigates to /
}
```

### 5.3 Logout Flow

```
1. User clicks logout (e.g., in Header)
2. Component calls onLogout() prop
3. useAuth().logout() is called
4. Storage is cleared (user session removed)
5. isAuthenticated becomes false
6. Routes re-render → show login route
7. User automatically redirected to /login
```

---

## 6. Navigation Patterns

### 6.1 Programmatic Navigation

```typescript
import { useNavigate } from 'react-router-dom'

function MyComponent() {
  const navigate = useNavigate()

  // Navigate to route
  navigate('/restaurant/abc123')

  // Navigate with replace (no history entry)
  navigate('/', { replace: true })

  // Navigate back
  navigate(-1)
}
```

### 6.2 Declarative Navigation

```typescript
import { Link, Navigate } from 'react-router-dom'

// Link component (preserves browser history)
<Link to="/restaurant/abc123">View Restaurant</Link>

// Navigate component (redirect)
{!isAuthenticated && <Navigate to="/login" replace />}
```

### 6.3 Nested Route Navigation

**Restaurant Component** (internal routing):
```typescript
function Restaurant() {
  const navigate = useNavigate()
  const location = useLocation()

  // Current path: /restaurant/abc123
  const placeId = location.pathname.split('/restaurant/')[1]

  // Navigate to different restaurant
  navigate(`/restaurant/${newPlaceId}`)
}
```

---

## 7. URL State Management

### 7.1 URL Preservation Pattern

**Component**: `RedirectToLogin`

```typescript
function RedirectToLogin() {
  const location = useLocation()

  // Save current path to sessionStorage
  useEffect(() => {
    if (location.pathname !== '/login') {
      sessionStorage.setItem('redirectUrl', location.pathname + location.search)
    }
  }, [location])

  return <Navigate to="/login" replace />
}
```

**Key Features**:
- Saves both pathname and search params
- Doesn't save if already on `/login` (prevents loop)
- Uses sessionStorage (clears on tab close)
- `replace` prop prevents back button to protected route

### 7.2 Query Parameters

```typescript
import { useSearchParams } from 'react-router-dom'

function MyComponent() {
  const [searchParams, setSearchParams] = useSearchParams()

  // Read query param
  const tab = searchParams.get('tab') || 'menu'

  // Set query param
  setSearchParams({ tab: 'reviews' })

  // Update multiple params
  setSearchParams(prev => {
    prev.set('tab', 'reviews')
    prev.set('page', '2')
    return prev
  })
}
```

**Example URL**: `/restaurant/abc123?tab=reviews&page=2`

### 7.3 URL Parameters

```typescript
import { useParams } from 'react-router-dom'

function Restaurant() {
  const { placeId } = useParams()

  // Route: /restaurant/:placeId
  // URL: /restaurant/abc123
  // placeId = 'abc123'
}
```

**Note**: Current implementation uses manual path parsing instead of route params (see Navigation Patterns section).

---

## 8. Common Patterns

### 8.1 Protected Route with Redirect

```typescript
// In App.tsx
{isAuthenticated ? (
  <Route path="/settings" element={<Settings onLogout={logout} />} />
) : (
  <Route path="/settings" element={<RedirectToLogin />} />
)}
```

**Alternative**: All non-login routes are already protected by the catch-all `*` route.

### 8.2 Conditional Navigation

```typescript
function MyComponent() {
  const navigate = useNavigate()
  const { isAuthenticated } = useAuth()

  const handleAction = () => {
    if (!isAuthenticated) {
      // Save current page to redirect after login
      sessionStorage.setItem('redirectUrl', window.location.pathname)
      navigate('/login')
      return
    }

    // Proceed with authenticated action
    // ...
  }
}
```

### 8.3 Navigation with State

```typescript
// Navigate with state
navigate('/restaurant/abc123', { state: { from: 'search' } })

// Read state in target component
function Restaurant() {
  const location = useLocation()
  const from = location.state?.from  // 'search'
}
```

**Use Cases**:
- Track navigation source (e.g., "from search" vs "from favorites")
- Pass temporary data between routes
- Show different UI based on navigation source

### 8.4 Route Change Detection

```typescript
import { useLocation } from 'react-router-dom'

function MyComponent() {
  const location = useLocation()

  useEffect(() => {
    console.log('Route changed:', location.pathname)
    // Perform action on route change (e.g., analytics, scroll reset)
  }, [location.pathname])
}
```

---

## 9. Related Documentation

### Web Documentation
- **[WEB-SETUP.md](./WEB-SETUP.md)**: Vite and TypeScript configuration
- **[WEB-LAYOUT.md](./WEB-LAYOUT.md)**: Layout components and responsive design
- **[WEB-HOME.md](./WEB-HOME.md)**: Home screen implementation
- **[WEB-RESTAURANT.md](./WEB-RESTAURANT.md)**: Restaurant detail with nested routing
- **[WEB-LOGIN.md](./WEB-LOGIN.md)**: Login screen implementation

### Shared Documentation
- **[SHARED-HOOKS.md](../03-shared/SHARED-HOOKS.md)**: useAuth hook implementation
- **[SHARED-CONTEXTS.md](../03-shared/SHARED-CONTEXTS.md)**: ThemeProvider, SocketProvider

### Core Documentation
- **[ARCHITECTURE.md](../00-core/ARCHITECTURE.md)**: Overall project architecture
- **[DEVELOPMENT.md](../00-core/DEVELOPMENT.md)**: Development workflow

---

## Appendix: React Router 7 Features

### Notable Changes from v6
- **Type-safe Routes**: Better TypeScript support
- **Data Loading**: Built-in data fetching (not yet used in this project)
- **Improved Nested Routes**: Better wildcard route handling
- **Form Actions**: Built-in form submission handling (not yet used)

### Current Usage
The project uses basic React Router features:
- Client-side routing with `<BrowserRouter>`
- Route protection with conditional rendering
- Programmatic navigation with `useNavigate()`
- URL state with `useLocation()` and `useSearchParams()`

**Future Enhancements**:
- Consider using route loaders for data fetching
- Implement route-level code splitting with `React.lazy()`
- Add route transitions with animation libraries

---

**Document Version**: 1.0.0
**Covers Files**: `App.tsx`, routing patterns in all route components
