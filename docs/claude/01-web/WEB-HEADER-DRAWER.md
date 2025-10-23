# WEB-HEADER-DRAWER.md

> **Last Updated**: 2025-10-23 21:30
> **Purpose**: Header and Drawer components documentation (navigation, menu, theme toggle)

---

## Table of Contents

1. [Overview](#1-overview)
2. [Header Component](#2-header-component)
3. [Drawer Component](#3-drawer-component)
4. [Integration Pattern](#4-integration-pattern)
5. [Theme Integration](#5-theme-integration)
6. [Navigation Flow](#6-navigation-flow)
7. [Best Practices](#7-best-practices)
8. [Related Documentation](#8-related-documentation)

---

## 1. Overview

The Header and Drawer components provide the main navigation interface for the web application. The Header contains the hamburger menu, app title, theme toggle, and user profile. The Drawer is a slide-out sidebar with user information and navigation links.

### Key Features
- **Header**: Fixed 48px height with hamburger menu, theme toggle, profile icon
- **Drawer**: Slide-out sidebar (240px width) with navigation menu
- **Theme Integration**: Both components adapt to light/dark theme
- **Modal Pattern**: Drawer uses React Native Modal with overlay
- **Navigation**: React Router integration for route changes

### Component Relationship
```
Page Component
├── Header (always visible)
│   ├── Hamburger → Opens Drawer
│   ├── Title
│   ├── Theme Toggle (🌙/☀️)
│   └── Profile Icon
└── Drawer (Modal)
    ├── User Info
    ├── Navigation Menu
    └── Logout Button
```

---

## 2. Header Component

### 2.1 File Location

**Location**: `apps/web/src/components/Header.tsx`

### 2.2 Component API

```typescript
interface HeaderProps {
  onMenuPress?: () => void;  // Callback to open drawer
}

const Header: React.FC<HeaderProps> = ({ onMenuPress }) => {
  // Implementation
}
```

**Props**:
- `onMenuPress`: Optional callback fired when hamburger menu is clicked

### 2.3 Implementation

```typescript
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '@shared/contexts';
import { useAuth } from '@shared/hooks';
import { THEME_COLORS, HEADER_HEIGHT } from '@shared/constants';

const Header: React.FC<HeaderProps> = ({ onMenuPress }) => {
  const { theme, isDark, toggleTheme } = useTheme();
  const { user } = useAuth();
  const colors = THEME_COLORS[theme];

  return (
    <View style={[styles.container, {
      backgroundColor: colors.headerBackground,
      borderBottomColor: colors.border
    }]}>
      {/* Hamburger Menu */}
      <TouchableOpacity style={styles.iconButton} onPress={onMenuPress}>
        <Text style={[styles.icon, { color: colors.headerText }]}>☰</Text>
      </TouchableOpacity>

      {/* Title */}
      <Text style={[styles.title, { color: colors.headerText }]}>Life Pickr</Text>

      <View style={styles.spacer} />

      {/* Theme Toggle */}
      <TouchableOpacity style={styles.iconButton} onPress={toggleTheme}>
        <Text style={styles.icon}>{isDark ? '☀️' : '🌙'}</Text>
      </TouchableOpacity>

      {/* Profile Icon */}
      {user && (
        <TouchableOpacity style={styles.iconButton} onPress={onMenuPress}>
          <View style={[styles.profileCircle, { backgroundColor: colors.primary }]}>
            <Text style={styles.profileText}>
              {user.username?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || 'U'}
            </Text>
          </View>
        </TouchableOpacity>
      )}
    </View>
  );
};
```

### 2.4 Header Structure

**Visual Layout**:
```
┌──────────────────────────────────────────────┐
│ [☰] Life Pickr      [spacer]      [🌙] [👤] │ 48px
└──────────────────────────────────────────────┘
```

**Element Breakdown**:
1. **Hamburger Menu (☰)**: Opens drawer
2. **Title**: "Life Pickr"
3. **Spacer**: Flex: 1 (pushes icons to right)
4. **Theme Toggle**: Moon (🌙) in light mode, Sun (☀️) in dark mode
5. **Profile Icon**: User's initial in circle (only shown when logged in)

### 2.5 Styling

```typescript
const styles = StyleSheet.create({
  container: {
    height: HEADER_HEIGHT,  // 48px from constants
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    borderBottomWidth: 1,
  },
  iconButton: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  icon: {
    fontSize: 20,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  spacer: {
    flex: 1,  // Pushes subsequent items to the right
  },
  profileCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
});
```

**Key Style Decisions**:
- **Fixed Height**: 48px (HEADER_HEIGHT constant)
- **Icon Buttons**: 36x36px touch targets (accessibility)
- **Spacer**: Flex layout for right-aligned icons
- **Profile Circle**: Primary color background with white text

### 2.6 Theme Integration

**Dynamic Colors**:
```typescript
const colors = THEME_COLORS[theme];

// Applied to styles
backgroundColor: colors.headerBackground  // White (light) / #1C1C1E (dark)
borderBottomColor: colors.border         // #E0E0E0 (light) / #38383A (dark)
color: colors.headerText                 // Black (light) / White (dark)
```

**Theme Toggle Icon**:
```typescript
{isDark ? '☀️' : '🌙'}
```
- Light mode: Shows moon (switch to dark)
- Dark mode: Shows sun (switch to light)

### 2.7 User Profile Icon

**Avatar Generation**:
```typescript
{user.username?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || 'U'}
```

**Logic**:
1. Try username first character
2. Fallback to email first character
3. Fallback to 'U' if neither exists

**Example**:
- Username "john" → "J"
- Email "alice@example.com" → "A"
- No data → "U"

---

## 3. Drawer Component

### 3.1 File Location

**Location**: `apps/web/src/components/Drawer.tsx`

### 3.2 Component API

```typescript
interface DrawerProps {
  visible: boolean;      // Control drawer visibility
  onClose: () => void;   // Callback to close drawer
  onLogout: () => void;  // Callback for logout action
}

const Drawer: React.FC<DrawerProps> = ({ visible, onClose, onLogout }) => {
  // Implementation
}
```

**Props**:
- `visible`: Boolean controlling drawer visibility
- `onClose`: Callback to close drawer (called on overlay click or X button)
- `onLogout`: Callback for logout (called when logout button clicked)

### 3.3 Implementation Structure

```typescript
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, Pressable } from 'react-native';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '@shared/contexts';
import { useAuth } from '@shared/hooks';
import { THEME_COLORS } from '@shared/constants';

const Drawer: React.FC<DrawerProps> = ({ visible, onClose, onLogout }) => {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const { user } = useAuth();
  const colors = THEME_COLORS[theme];

  const handleNavigation = (path: string) => {
    onClose();       // Close drawer first
    navigate(path);  // Navigate to route
  };

  const handleLogout = () => {
    onClose();   // Close drawer first
    onLogout();  // Trigger logout
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      {/* Overlay (click to close) */}
      <Pressable style={styles.overlay} onPress={onClose}>
        {/* Drawer (prevents click-through) */}
        <Pressable style={[styles.drawer, { backgroundColor: colors.background }]}
          onPress={(e) => e.stopPropagation()}>
          {/* Content sections */}
        </Pressable>
      </Pressable>
    </Modal>
  );
};
```

### 3.4 Drawer Structure

**Visual Layout**:
```
┌─────────────────────┐
│ 메뉴             [✕] │ ← Header
├─────────────────────┤
│  [J] John          │
│      john@email.com│ ← User Section
├─────────────────────┤
│ 🏠 홈              │
│ 🍴 맛집            │
│ 👤 프로필          │ ← Menu Items
│ ⚙️ 설정            │
│ ℹ️ 정보            │
│                    │
│       (flex)       │
├─────────────────────┤
│  [로그아웃]         │ ← Footer
└─────────────────────┘
240px width
```

### 3.5 Drawer Sections

#### Header Section
```typescript
<View style={[styles.drawerHeader, { borderBottomColor: colors.border }]}>
  <Text style={[styles.drawerTitle, { color: colors.text }]}>메뉴</Text>
  <TouchableOpacity onPress={onClose} style={styles.closeButton}>
    <Text style={[styles.closeButtonText, { color: colors.text }]}>✕</Text>
  </TouchableOpacity>
</View>
```

**Features**:
- Title: "메뉴" (Menu)
- Close button: "✕" (X icon)
- Border bottom separator

#### User Section
```typescript
{user && (
  <View style={[styles.userSection, { borderBottomColor: colors.border }]}>
    <View style={[styles.userAvatar, { backgroundColor: colors.primary }]}>
      <Text style={styles.userAvatarText}>
        {user.username?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || 'U'}
      </Text>
    </View>
    <View style={styles.userInfo}>
      <Text style={[styles.userName, { color: colors.text }]}>{user.username}</Text>
      <Text style={[styles.userEmail, { color: colors.textSecondary }]}>{user.email}</Text>
    </View>
  </View>
)}
```

**Features**:
- Avatar: Circular icon with user initial
- Username: Primary text (bold)
- Email: Secondary text (smaller, gray)
- Only shown when user is logged in

#### Menu Items
```typescript
<View style={styles.menuItems}>
  <TouchableOpacity style={styles.menuItem} onPress={() => handleNavigation('/')}>
    <Text style={[styles.menuItemIcon, { color: colors.text }]}>🏠</Text>
    <Text style={[styles.menuItemText, { color: colors.text }]}>홈</Text>
  </TouchableOpacity>

  <TouchableOpacity style={styles.menuItem} onPress={() => handleNavigation('/restaurant')}>
    <Text style={[styles.menuItemIcon, { color: colors.text }]}>🍴</Text>
    <Text style={[styles.menuItemText, { color: colors.text }]}>맛집</Text>
  </TouchableOpacity>

  {/* Additional menu items... */}
</View>
```

**Current Menu Items**:
1. 🏠 홈 (Home) → `/`
2. 🍴 맛집 (Restaurant) → `/restaurant`
3. 👤 프로필 (Profile) → (Not implemented)
4. ⚙️ 설정 (Settings) → (Not implemented)
5. ℹ️ 정보 (Info) → (Not implemented)

**Navigation Pattern**:
```typescript
const handleNavigation = (path: string) => {
  onClose();       // Close drawer first (smooth UX)
  navigate(path);  // Navigate using React Router
};
```

#### Footer Section
```typescript
<View style={styles.footer}>
  <TouchableOpacity
    style={[styles.logoutButton, { backgroundColor: colors.error }]}
    onPress={handleLogout}
  >
    <Text style={styles.logoutButtonText}>로그아웃</Text>
  </TouchableOpacity>
</View>
```

**Features**:
- Red logout button (colors.error)
- Fixed at bottom of drawer
- Closes drawer before logout

### 3.6 Modal Pattern

**React Native Modal**:
```typescript
<Modal
  visible={visible}
  transparent           // Show overlay
  animationType="fade"  // Fade in/out animation
  onRequestClose={onClose}  // Android back button handler
>
```

**Overlay Pattern**:
```typescript
<Pressable style={styles.overlay} onPress={onClose}>
  {/* Dark semi-transparent background */}
</Pressable>
```

**Prevent Click-Through**:
```typescript
<Pressable
  style={styles.drawer}
  onPress={(e) => e.stopPropagation()}  // Prevent closing on drawer click
>
```

**Important**: `stopPropagation()` prevents clicks inside drawer from closing it.

### 3.7 Styling

```typescript
const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',  // 50% opacity black
    justifyContent: 'flex-start',
  },
  drawer: {
    width: 240,  // Fixed drawer width
    height: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,  // Android shadow
  },
  // ... other styles
});
```

**Key Style Decisions**:
- **Width**: 240px (narrow enough to not block content)
- **Overlay**: 50% opacity black background
- **Shadow**: Elevation effect for depth
- **Full Height**: Drawer spans entire viewport height

---

## 4. Integration Pattern

### 4.1 Usage in Page Components

**Example** (Home.tsx, Restaurant.tsx):

```typescript
const MyPage: React.FC = ({ onLogout }) => {
  const [drawerVisible, setDrawerVisible] = useState(false);

  const handleLogout = async () => {
    await onLogout();
    window.location.href = '/login';
  };

  return (
    <div className="page-container">
      <Header onMenuPress={() => setDrawerVisible(true)} />

      {/* Page content */}

      <Drawer
        visible={drawerVisible}
        onClose={() => setDrawerVisible(false)}
        onLogout={handleLogout}
      />
    </div>
  );
};
```

### 4.2 State Management

**Pattern**: Local state in page component

```typescript
const [drawerVisible, setDrawerVisible] = useState(false);
```

**Why Local?**
- Drawer visibility is page-specific
- No need for global state (Context/Redux)
- Simple and performant

### 4.3 Interaction Flow

```
1. User clicks hamburger menu in Header
   → onMenuPress() callback fired
   → setDrawerVisible(true)

2. Drawer opens (Modal visible={true})
   → Overlay appears
   → Drawer slides in (animationType="fade")

3. User clicks menu item (e.g., "홈")
   → handleNavigation() called
   → onClose() closes drawer
   → navigate('/') changes route

4. User clicks overlay or X button
   → onClose() callback fired
   → setDrawerVisible(false)
   → Drawer closes
```

---

## 5. Theme Integration

### 5.1 Header Theme Colors

```typescript
const colors = THEME_COLORS[theme];

// Applied colors
headerBackground: colors.headerBackground  // #FFFFFF (light) / #1C1C1E (dark)
border: colors.border                     // #E0E0E0 (light) / #38383A (dark)
headerText: colors.headerText             // #000000 (light) / #FFFFFF (dark)
primary: colors.primary                   // #007AFF (light) / #0A84FF (dark)
```

### 5.2 Drawer Theme Colors

```typescript
const colors = THEME_COLORS[theme];

// Applied colors
background: colors.background        // #FFFFFF (light) / #000000 (dark)
border: colors.border               // Separator lines
text: colors.text                   // Primary text
textSecondary: colors.textSecondary // Email, subtitles
primary: colors.primary             // Avatar background
error: colors.error                 // Logout button (#FF3B30 light / #FF453A dark)
```

### 5.3 Theme Toggle Behavior

**User Flow**:
```
1. User clicks theme icon in Header
   → toggleTheme() called
   → Theme changes (light ↔ dark)
   → All components re-render with new colors
   → Theme saved to localStorage

2. Header updates:
   - Icon changes: 🌙 → ☀️ (or vice versa)
   - Colors update instantly

3. Drawer updates (if open):
   - Background, text, borders update
   - No flicker or delay
```

---

## 6. Navigation Flow

### 6.1 Navigation Methods

**React Router Integration**:
```typescript
import { useNavigate } from 'react-router-dom';

const navigate = useNavigate();

const handleNavigation = (path: string) => {
  onClose();       // Close drawer first
  navigate(path);  // Navigate to path
};
```

**Why Close First?**
- Better UX (drawer doesn't linger)
- Prevents visual glitches during route transition
- Consistent behavior across all menu items

### 6.2 Current Routes

| Menu Item | Icon | Path | Status |
|-----------|------|------|--------|
| 홈 (Home) | 🏠 | `/` | ✅ Implemented |
| 맛집 (Restaurant) | 🍴 | `/restaurant` | ✅ Implemented |
| 프로필 (Profile) | 👤 | (No handler) | ❌ Placeholder |
| 설정 (Settings) | ⚙️ | (No handler) | ❌ Placeholder |
| 정보 (Info) | ℹ️ | (No handler) | ❌ Placeholder |

**Adding New Routes**:
```typescript
<TouchableOpacity style={styles.menuItem} onPress={() => handleNavigation('/settings')}>
  <Text style={[styles.menuItemIcon, { color: colors.text }]}>⚙️</Text>
  <Text style={[styles.menuItemText, { color: colors.text }]}>설정</Text>
</TouchableOpacity>
```

### 6.3 Logout Flow

```
1. User clicks "로그아웃" button in Drawer
   → handleLogout() called
   → onClose() closes drawer
   → onLogout() prop callback fired

2. Parent component's onLogout handler:
   → Calls API/clear storage
   → window.location.href = '/login'  // Force reload to clear state

3. User redirected to login page
```

---

## 7. Best Practices

### 7.1 Always Close Drawer Before Navigation

**❌ Bad** (drawer stays open):
```typescript
const handleNavigation = (path: string) => {
  navigate(path);
  // Drawer remains open
};
```

**✅ Good** (close first):
```typescript
const handleNavigation = (path: string) => {
  onClose();       // Close drawer first
  navigate(path);  // Then navigate
};
```

### 7.2 Use stopPropagation for Drawer Clicks

**❌ Bad** (drawer closes on any click):
```typescript
<Pressable style={styles.overlay} onPress={onClose}>
  <View style={styles.drawer}>
    {/* Clicks inside drawer close it */}
  </View>
</Pressable>
```

**✅ Good** (only overlay clicks close):
```typescript
<Pressable style={styles.overlay} onPress={onClose}>
  <Pressable style={styles.drawer} onPress={(e) => e.stopPropagation()}>
    {/* Clicks inside drawer don't close it */}
  </Pressable>
</Pressable>
```

### 7.3 Provide onRequestClose for Android

```typescript
<Modal
  visible={visible}
  onRequestClose={onClose}  // Android back button handler
>
```

**Why?**: Android back button needs to close drawer, not exit app.

### 7.4 Use Semantic Icon Sizes

**Touch Targets**: 36x36px minimum (accessibility)
```typescript
iconButton: {
  width: 36,
  height: 36,
}
```

**Icons**: 18-20px for readability
```typescript
icon: {
  fontSize: 20,
}
```

---

## 8. Related Documentation

### Web Documentation
- **[WEB-THEME.md](./WEB-THEME.md)**: Theme system integration
- **[WEB-ROUTING.md](./WEB-ROUTING.md)**: Navigation and routing
- **[WEB-LAYOUT.md](./WEB-LAYOUT.md)**: Page layout patterns
- **[WEB-HOME.md](./WEB-HOME.md)**: Home page implementation
- **[WEB-PATTERNS.md](./WEB-PATTERNS.md)**: React Native Web patterns

### Shared Documentation
- **[SHARED-CONTEXTS.md](../03-shared/SHARED-CONTEXTS.md)**: ThemeContext usage
- **[SHARED-HOOKS.md](../03-shared/SHARED-HOOKS.md)**: useAuth hook

### Core Documentation
- **[ARCHITECTURE.md](../00-core/ARCHITECTURE.md)**: Overall architecture
- **[DEVELOPMENT.md](../00-core/DEVELOPMENT.md)**: Development workflow

---

**Document Version**: 1.0.0
**Covers Files**: `Header.tsx`, `Drawer.tsx`, navigation patterns
