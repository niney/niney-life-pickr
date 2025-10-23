# WEB-THEME.md

> **Last Updated**: 2025-10-23 21:20
> **Purpose**: Theme system documentation (light/dark mode, color palette, ThemeContext)

---

## Table of Contents

1. [Overview](#1-overview)
2. [Theme Colors](#2-theme-colors)
3. [ThemeContext Implementation](#3-themecontext-implementation)
4. [useTheme Hook](#4-usetheme-hook)
5. [Theme Persistence](#5-theme-persistence)
6. [Usage in Components](#6-usage-in-components)
7. [Theme Toggle UI](#7-theme-toggle-ui)
8. [Best Practices](#8-best-practices)
9. [Related Documentation](#9-related-documentation)

---

## 1. Overview

The web application supports **light** and **dark** themes with automatic persistence to local storage. The theme system is built using React Context and shared between web and mobile via `@shared/contexts`.

### Key Features
- **Two Themes**: Light and Dark mode
- **Automatic Persistence**: Theme saved to storage (localStorage on web)
- **Cross-platform**: Shared theme constants and context
- **Toggle UI**: Moon (🌙) / Sun (☀️) icon in header
- **Seamless Switching**: Instant theme application without reload

### Architecture
```
Theme System
├── THEME_COLORS (shared/constants/theme.constants.ts)
│   ├── light { background, surface, primary, text, ... }
│   └── dark { background, surface, primary, text, ... }
├── ThemeContext (shared/contexts/ThemeContext.tsx)
│   ├── Theme state management
│   ├── Storage persistence
│   └── Toggle function
└── useTheme Hook
    ├── theme: 'light' | 'dark'
    ├── isDark: boolean
    ├── toggleTheme: () => void
    └── setTheme: (theme) => void
```

---

## 2. Theme Colors

### 2.1 Color Palette

**Location**: `apps/shared/constants/theme.constants.ts`

```typescript
export const THEME_COLORS = {
  light: {
    background: '#FFFFFF',       // Page background
    surface: '#F5F5F5',          // Card/panel background
    primary: '#007AFF',          // Primary brand color (iOS blue)
    secondary: '#5856D6',        // Secondary accent color
    text: '#000000',             // Primary text
    textSecondary: '#666666',    // Secondary text (labels, subtitles)
    border: '#E0E0E0',           // Border color
    error: '#FF3B30',            // Error state
    success: '#34C759',          // Success state
    headerBackground: '#FFFFFF', // Header background
    headerText: '#000000',       // Header text
  },
  dark: {
    background: '#000000',       // Page background (true black)
    surface: '#1C1C1E',          // Card/panel background
    primary: '#0A84FF',          // Primary brand color (brighter for dark mode)
    secondary: '#5E5CE6',        // Secondary accent color
    text: '#FFFFFF',             // Primary text
    textSecondary: '#ABABAB',    // Secondary text
    border: '#38383A',           // Border color
    error: '#FF453A',            // Error state
    success: '#32D74B',          // Success state
    headerBackground: '#1C1C1E', // Header background
    headerText: '#FFFFFF',       // Header text
  },
};

export const HEADER_HEIGHT = 48;
```

### 2.2 Color Usage Guidelines

| Color Key | Usage | Examples |
|-----------|-------|----------|
| `background` | Page/screen background | Main app background |
| `surface` | Cards, panels, containers | Restaurant cards, review panels |
| `primary` | Primary actions, links, active states | Buttons, links, selected items |
| `secondary` | Secondary actions, badges | Tags, labels |
| `text` | Main content text | Headings, body text |
| `textSecondary` | Secondary information | Timestamps, subtitles, hints |
| `border` | Dividers, borders, outlines | Card borders, separators |
| `error` | Error messages, destructive actions | Error alerts, delete buttons |
| `success` | Success messages, positive actions | Success alerts, confirm buttons |
| `headerBackground` | Header bar background | Top navigation bar |
| `headerText` | Header bar text | Header title, icons |

**Important**: Do NOT use hardcoded colors. Always use `THEME_COLORS[theme].<colorKey>`.

### 2.3 Design Philosophy

**Light Mode**:
- Clean, bright, minimalist aesthetic
- iOS-style design language
- High contrast for readability

**Dark Mode**:
- True black background (`#000000`) for OLED displays
- Elevated surfaces with subtle gray (`#1C1C1E`)
- Brighter accent colors for visibility
- Reduced eye strain in low-light environments

---

## 3. ThemeContext Implementation

### 3.1 Context Definition

**Location**: `apps/shared/contexts/ThemeContext.tsx`

```typescript
import React, { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { storage } from '../utils';

export type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  isDark: boolean;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);
```

### 3.2 ThemeProvider Component

```typescript
interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const [theme, setThemeState] = useState<Theme>('light');

  // Load theme from storage on mount
  useEffect(() => {
    const loadTheme = async () => {
      try {
        const savedTheme = await storage.getItem('app_theme');
        if (savedTheme === 'dark' || savedTheme === 'light') {
          setThemeState(savedTheme);
        }
      } catch (error) {
        console.error('Failed to load theme:', error);
      }
    };
    loadTheme();
  }, []);

  const setTheme = async (newTheme: Theme) => {
    setThemeState(newTheme);
    try {
      await storage.setItem('app_theme', newTheme);
    } catch (error) {
      console.error('Failed to save theme:', error);
    }
  };

  const toggleTheme = () => {
    setTheme(theme === 'light' ? 'dark' : 'light');
  };

  const value: ThemeContextType = {
    theme,
    isDark: theme === 'dark',
    toggleTheme,
    setTheme,
  };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};
```

**Key Features**:
- **Auto-load**: Reads theme from storage on mount
- **Auto-save**: Persists theme changes to storage
- **Type Safety**: TypeScript validates theme values
- **Error Handling**: Graceful fallback if storage fails

### 3.3 Context Provider Setup

**Location**: `apps/web/src/App.tsx`

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
1. **ThemeProvider** (outermost): Global theme state
2. **SocketProvider**: Real-time communication
3. **AppContent** (with BrowserRouter): Routing

---

## 4. useTheme Hook

### 4.1 Hook API

```typescript
export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
};
```

**Returns**:
```typescript
interface ThemeContextType {
  theme: Theme;               // Current theme ('light' | 'dark')
  isDark: boolean;            // Convenience boolean (theme === 'dark')
  toggleTheme: () => void;    // Toggle between light and dark
  setTheme: (theme: Theme) => void;  // Set specific theme
}
```

### 4.2 Usage Examples

#### Basic Usage
```typescript
import { useTheme } from '@shared/contexts';
import { THEME_COLORS } from '@shared/constants';

function MyComponent() {
  const { theme } = useTheme();
  const colors = THEME_COLORS[theme];

  return (
    <View style={{ backgroundColor: colors.background }}>
      <Text style={{ color: colors.text }}>Hello</Text>
    </View>
  );
}
```

#### Theme Toggle
```typescript
function ThemeToggleButton() {
  const { isDark, toggleTheme } = useTheme();

  return (
    <TouchableOpacity onPress={toggleTheme}>
      <Text>{isDark ? '☀️' : '🌙'}</Text>
    </TouchableOpacity>
  );
}
```

#### Programmatic Theme Change
```typescript
function SettingsScreen() {
  const { theme, setTheme } = useTheme();

  return (
    <>
      <Button
        title="Light Mode"
        onPress={() => setTheme('light')}
        disabled={theme === 'light'}
      />
      <Button
        title="Dark Mode"
        onPress={() => setTheme('dark')}
        disabled={theme === 'dark'}
      />
    </>
  );
}
```

---

## 5. Theme Persistence

### 5.1 Storage Key

**Storage Key**: `app_theme`

**Values**: `'light'` | `'dark'`

### 5.2 Storage Implementation

**Web** (localStorage):
```typescript
// Save
localStorage.setItem('app_theme', 'dark');

// Load
const theme = localStorage.getItem('app_theme'); // 'dark'
```

**Mobile** (AsyncStorage):
```typescript
// Save
await AsyncStorage.setItem('app_theme', 'dark');

// Load
const theme = await AsyncStorage.getItem('app_theme'); // 'dark'
```

**Unified API** (storage utility):
```typescript
import { storage } from '@shared/utils';

// Save (cross-platform)
await storage.setItem('app_theme', 'dark');

// Load (cross-platform)
const theme = await storage.getItem('app_theme');
```

### 5.3 Persistence Flow

```
1. User toggles theme (🌙 → ☀️)
2. toggleTheme() calls setTheme('dark')
3. setThemeState('dark') updates React state
4. storage.setItem('app_theme', 'dark') persists to storage
5. All components re-render with new theme colors

--- On Next App Launch ---

6. ThemeProvider mounts
7. useEffect runs → storage.getItem('app_theme')
8. Returns 'dark'
9. setThemeState('dark') restores theme
10. App renders with dark theme
```

---

## 6. Usage in Components

### 6.1 Header Component

**Location**: `apps/web/src/components/Header.tsx`

```typescript
import { useTheme } from '@shared/contexts';
import { THEME_COLORS } from '@shared/constants';

const Header: React.FC<HeaderProps> = ({ onMenuPress }) => {
  const { theme, isDark, toggleTheme } = useTheme();
  const colors = THEME_COLORS[theme];

  return (
    <View style={[styles.container, {
      backgroundColor: colors.headerBackground,
      borderBottomColor: colors.border
    }]}>
      <Text style={[styles.title, { color: colors.headerText }]}>
        Life Pickr
      </Text>

      {/* Theme toggle button */}
      <TouchableOpacity onPress={toggleTheme}>
        <Text style={styles.icon}>{isDark ? '☀️' : '🌙'}</Text>
      </TouchableOpacity>
    </View>
  );
};
```

**Pattern**:
1. Import `useTheme` hook and `THEME_COLORS`
2. Extract `theme` from hook
3. Get `colors` object: `THEME_COLORS[theme]`
4. Apply colors to styles: `{ backgroundColor: colors.background }`

### 6.2 Restaurant Component

**Location**: `apps/web/src/components/Restaurant.tsx`

```typescript
const Restaurant: React.FC<RestaurantProps> = ({ onLogout }) => {
  const { theme } = useTheme();
  const colors = THEME_COLORS[theme];

  return (
    <div className="page-container" style={{ backgroundColor: colors.background }}>
      <Header />
      {/* ... */}
    </div>
  );
};
```

### 6.3 Inline Styles vs StyleSheet

**React Native Web StyleSheet** (static styles):
```typescript
const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  // Cannot use theme colors here (static)
});
```

**Inline Styles** (dynamic theme colors):
```typescript
<View style={[
  styles.container,
  { backgroundColor: colors.background }  // Dynamic color
]}>
```

**Pattern**: Use `StyleSheet.create()` for layout/sizing, inline styles for theme colors.

---

## 7. Theme Toggle UI

### 7.1 Header Theme Toggle

**Location**: `apps/web/src/components/Header.tsx`

```typescript
{/* Theme toggle button */}
<TouchableOpacity style={styles.iconButton} onPress={toggleTheme}>
  <Text style={styles.icon}>{isDark ? '☀️' : '🌙'}</Text>
</TouchableOpacity>
```

**Behavior**:
- **Light Mode**: Shows moon icon (🌙) → Click to switch to dark
- **Dark Mode**: Shows sun icon (☀️) → Click to switch to light
- **Instant Feedback**: Theme changes immediately without reload

### 7.2 Icon Choice

| Theme | Icon | Meaning |
|-------|------|---------|
| Light | 🌙 (Moon) | "Switch to dark mode" |
| Dark | ☀️ (Sun) | "Switch to light mode" |

**Design Rationale**: Icon represents the **target** theme, not the current theme.

### 7.3 Visual Feedback

- **No loading state**: Theme switch is instant
- **No confirmation dialog**: Single-click toggle
- **System-wide**: All components update simultaneously

---

## 8. Best Practices

### 8.1 Always Use Theme Colors

**❌ Bad** (hardcoded colors):
```typescript
<View style={{ backgroundColor: '#FFFFFF' }}>
  <Text style={{ color: '#000000' }}>Hello</Text>
</View>
```

**✅ Good** (theme colors):
```typescript
const { theme } = useTheme();
const colors = THEME_COLORS[theme];

<View style={{ backgroundColor: colors.background }}>
  <Text style={{ color: colors.text }}>Hello</Text>
</View>
```

### 8.2 Extract Colors Object

**❌ Bad** (repeated lookups):
```typescript
<View style={{ backgroundColor: THEME_COLORS[theme].background }}>
  <Text style={{ color: THEME_COLORS[theme].text }}>Hello</Text>
  <Text style={{ color: THEME_COLORS[theme].textSecondary }}>World</Text>
</View>
```

**✅ Good** (extracted once):
```typescript
const colors = THEME_COLORS[theme];

<View style={{ backgroundColor: colors.background }}>
  <Text style={{ color: colors.text }}>Hello</Text>
  <Text style={{ color: colors.textSecondary }}>World</Text>
</View>
```

### 8.3 Use Semantic Color Names

**❌ Bad** (unclear usage):
```typescript
<View style={{ backgroundColor: colors.primary }}>
```

**✅ Good** (clear intent):
```typescript
// For page background
<View style={{ backgroundColor: colors.background }}>

// For card/panel
<View style={{ backgroundColor: colors.surface }}>

// For button
<TouchableOpacity style={{ backgroundColor: colors.primary }}>
```

### 8.4 Test Both Themes

Always test your UI in both light and dark modes to ensure:
- **Contrast**: Text is readable on backgrounds
- **Consistency**: Visual hierarchy is maintained
- **Borders**: Visible in both themes

**Quick Test**:
```typescript
// Add temporary override to App.tsx (for testing)
useEffect(() => {
  setTheme('dark'); // Force dark mode for testing
}, []);
```

### 8.5 Avoid Theme-Specific Logic

**❌ Bad** (theme-specific code):
```typescript
if (theme === 'dark') {
  return <DarkModeComponent />;
} else {
  return <LightModeComponent />;
}
```

**✅ Good** (theme-agnostic component):
```typescript
const colors = THEME_COLORS[theme];
return (
  <View style={{ backgroundColor: colors.background }}>
    {/* Same component, different colors */}
  </View>
);
```

---

## 9. Related Documentation

### Shared Documentation
- **[SHARED-CONTEXTS.md](../03-shared/SHARED-CONTEXTS.md)**: ThemeContext full implementation
- **[SHARED-UTILS.md](../03-shared/SHARED-UTILS.md)**: Storage utility (persistence)

### Web Documentation
- **[WEB-SETUP.md](./WEB-SETUP.md)**: App setup with ThemeProvider
- **[WEB-LAYOUT.md](./WEB-LAYOUT.md)**: Layout components using theme
- **[WEB-HEADER-DRAWER.md](./WEB-HEADER-DRAWER.md)**: Header theme toggle implementation
- **[WEB-PATTERNS.md](./WEB-PATTERNS.md)**: React Native Web styling patterns

### Core Documentation
- **[ARCHITECTURE.md](../00-core/ARCHITECTURE.md)**: Overall project architecture
- **[DEVELOPMENT.md](../00-core/DEVELOPMENT.md)**: Development workflow

---

## Appendix: Future Enhancements

### Potential Features
1. **System Theme Detection**: Auto-detect OS theme preference
   ```typescript
   const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
   ```

2. **Scheduled Theme Switching**: Auto-switch based on time of day
   ```typescript
   const hour = new Date().getHours();
   const isDayTime = hour >= 6 && hour < 18;
   ```

3. **Custom Theme Colors**: Allow users to customize accent colors

4. **High Contrast Mode**: Accessibility option for enhanced contrast

5. **Theme Transitions**: Smooth fade animation between themes

---

**Document Version**: 1.0.0
**Covers Files**: `ThemeContext.tsx`, `theme.constants.ts`, `Header.tsx`, theme usage in all components
