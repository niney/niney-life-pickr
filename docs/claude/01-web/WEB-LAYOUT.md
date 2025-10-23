# WEB-LAYOUT.md

> **Last Updated**: 2025-10-23 21:25
> **Purpose**: Responsive layout patterns, desktop/mobile layouts, and CSS grid structure

---

## Table of Contents

1. [Overview](#1-overview)
2. [Responsive Design Strategy](#2-responsive-design-strategy)
3. [Layout Containers](#3-layout-containers)
4. [Desktop Layout Patterns](#4-desktop-layout-patterns)
5. [Mobile Layout Patterns](#5-mobile-layout-patterns)
6. [CSS Grid System](#6-css-grid-system)
7. [Scroll Management](#7-scroll-management)
8. [Best Practices](#8-best-practices)
9. [Related Documentation](#9-related-documentation)

---

## 1. Overview

The web application uses **responsive design** with separate layout strategies for desktop (≥768px) and mobile (<768px). Desktop uses CSS Grid for fixed panel layouts with independent scrolling, while mobile uses full-screen routing transitions.

### Key Features
- **Breakpoint**: 768px (desktop vs mobile)
- **Desktop**: CSS Grid with fixed left panel (420px) + flexible right panel
- **Mobile**: Full-screen toggle via React Router
- **Scroll Management**: Independent scroll areas on desktop, natural scroll on mobile
- **React Native Web**: StyleSheet for layout, inline styles for theme colors

### Architecture
```
Layout System
├── Page Container (.page-container)
│   └── Simple pages (Home, Login)
├── Grid Container (.restaurant-grid-container)
│   ├── Header (fixed)
│   └── Content (scrollable)
│       ├── Desktop: 420px List + flex Detail (side-by-side)
│       └── Mobile: 100% List OR 100% Detail (toggle via routing)
└── Responsive Detection
    └── window.innerWidth < 768 → isMobile state
```

---

## 2. Responsive Design Strategy

### 2.1 Breakpoint System

**Single Breakpoint**: `768px`

```typescript
// In Component
const [isMobile, setIsMobile] = useState(window.innerWidth < 768)

useEffect(() => {
  const handleResize = () => {
    setIsMobile(window.innerWidth < 768)
  }
  window.addEventListener('resize', handleResize)
  return () => window.removeEventListener('resize', handleResize)
}, [])
```

**CSS Media Query**:
```css
@media (min-width: 768px) {
  /* Desktop styles */
}

/* Mobile styles (default) */
```

**Why 768px?**
- Standard tablet landscape breakpoint
- Sufficient width for side-by-side panels (420px + 348px minimum)
- Matches common Bootstrap/Material UI conventions

### 2.2 Conditional Rendering

**Pattern**: Complete layout separation based on `isMobile` state

```typescript
{isMobile ? (
  <MobileLayout />  // Full-screen, route-based toggle
) : (
  <DesktopLayout /> // Split-panel, simultaneous view
)}
```

**Benefits**:
- Clear separation of concerns
- No CSS-only hacks for complex layout changes
- Different routing strategies per layout

---

## 3. Layout Containers

### 3.1 Page Container (Simple Pages)

**Usage**: Home, Login, Settings

**HTML**:
```tsx
<div className="page-container" style={{ backgroundColor: colors.background }}>
  <Header />
  <View style={styles.content}>
    {/* Content */}
  </View>
</div>
```

**CSS** (index.css):
```css
/* No explicit CSS - relies on natural document flow */
```

**Characteristics**:
- Natural document flow
- No height restrictions
- Scrolls entire page
- Simple content (no split panels)

### 3.2 Grid Container (Complex Pages)

**Usage**: Restaurant (split-panel layout)

**HTML**:
```tsx
<div className="restaurant-grid-container" style={{ backgroundColor: colors.background }}>
  <Header />
  <div className={`restaurant-content ${isMobile ? 'mobile' : 'desktop'}`}>
    {/* Split-panel content */}
  </div>
</div>
```

**CSS** (index.css):
```css
@media (min-width: 768px) {
  .restaurant-grid-container {
    display: grid;
    grid-template-rows: auto 1fr;  /* Header + Content */
    height: 100vh;                 /* Full viewport height */
    overflow: hidden;              /* Prevent page scroll */
  }

  .restaurant-content {
    display: grid;
    overflow: hidden;
  }

  .restaurant-content.desktop {
    grid-template-columns: 420px 1fr;  /* Fixed left + flexible right */
  }
}
```

**Characteristics**:
- Fixed viewport height (100vh)
- No page-level scrolling
- Independent scroll areas for panels
- CSS Grid for precise control

---

## 4. Desktop Layout Patterns

### 4.1 Split-Panel Layout

**Restaurant Component** (`apps/web/src/components/Restaurant.tsx`):

```typescript
const Restaurant: React.FC<RestaurantProps> = ({ onLogout }) => {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)

  return (
    <div className="restaurant-grid-container">
      <Header />
      <div className={`restaurant-content desktop`}>
        {/* Desktop: Both panels visible simultaneously */}
        <RestaurantList isMobile={false} />  {/* Left: 420px */}
        <Routes>
          <Route path=":id" element={<RestaurantDetail isMobile={false} />} />  {/* Right: flex */}
        </Routes>
      </div>
    </div>
  )
}
```

**CSS Grid Structure**:
```css
.restaurant-content.desktop {
  grid-template-columns: 420px 1fr;
}
```

**Visual Representation**:
```
┌─────────────────────────────────────┐
│  Header (48px height)               │
├───────────┬─────────────────────────┤
│           │                         │
│  List     │  Detail                 │
│  420px    │  flex (remaining width) │
│           │                         │
│  Scroll   │  Scroll                 │
│           │                         │
└───────────┴─────────────────────────┘
```

### 4.2 Independent Scroll Areas

**Pattern**: Each panel scrolls independently

```css
.restaurant-scroll-area {
  overflow-y: auto;  /* Vertical scroll only */
  height: 100%;      /* Fill grid cell */
}
```

**Usage in Component**:
```tsx
<div className="restaurant-scroll-area" style={{ backgroundColor: colors.surface }}>
  {/* Scrollable content */}
</div>
```

**Behavior**:
- **Left Panel**: Restaurant list scrolls independently
- **Right Panel**: Restaurant detail scrolls independently
- **Page**: No page-level scroll (overflow: hidden)

### 4.3 Fixed Sidebar Width

**Why 420px?**
- Sufficient for restaurant cards (390px content + 30px padding)
- Not too wide (leaves space for detail panel)
- Matches common sidebar conventions

**Responsive Width**:
```css
@media (min-width: 768px) {
  .restaurant-content.desktop {
    grid-template-columns: 420px 1fr;  /* 420px fixed */
  }
}

@media (min-width: 1024px) {
  .restaurant-content.desktop {
    grid-template-columns: 420px 1fr;  /* Still 420px (not wider) */
  }
}
```

---

## 5. Mobile Layout Patterns

### 5.1 Full-Screen Toggle

**Pattern**: Route-based navigation between list and detail

```typescript
{isMobile ? (
  <Routes>
    <Route index element={<RestaurantList isMobile={true} />} />
    <Route path=":id" element={<RestaurantDetail isMobile={true} />} />
  </Routes>
) : (
  // Desktop layout
)}
```

**Behavior**:
- **Path: `/restaurant`** → Shows RestaurantList (full screen)
- **Path: `/restaurant/:id`** → Shows RestaurantDetail (full screen)
- **Navigation**: Clicking restaurant card navigates to detail route

**Visual Representation**:
```
Mobile List View         Mobile Detail View
┌─────────────┐         ┌─────────────┐
│  Header     │         │  Header     │
├─────────────┤         ├─────────────┤
│             │         │             │
│  List       │  →      │  Detail     │
│  (100%)     │ Click   │  (100%)     │
│             │         │             │
│  Scroll     │         │  Scroll     │
│             │         │             │
└─────────────┘         └─────────────┘
```

### 5.2 Mobile Scroll Reset

**Problem**: Scroll position persists across route changes

**Solution**: Reset scroll on route change

```typescript
useEffect(() => {
  if (isMobile) {
    window.scrollTo(0, 0)
    document.body.scrollTop = 0
    document.documentElement.scrollTop = 0
  }
}, [location.pathname, isMobile])
```

**When to Run**:
- Only on mobile (`if (isMobile)`)
- On route change (`location.pathname` dependency)

### 5.3 Mobile CSS

**No Mobile-Specific Container**:
```css
/* Mobile uses default document flow (no media query) */
.restaurant-content {
  /* No grid layout on mobile */
  /* Natural document flow */
}
```

**Scroll Behavior**:
- Natural page scrolling
- No fixed heights
- No overflow hidden
- Entire page scrolls as one unit

---

## 6. CSS Grid System

### 6.1 Global Styles

**Location**: `apps/web/src/index.css`

```css
/* Global Reset */
html, body {
  margin: 0;
  padding: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
}

/* Desktop: Fixed height, no page scroll */
@media (min-width: 768px) {
  html, body {
    height: 100%;
    overflow: hidden;
  }

  #root {
    height: 100%;
  }
}

* {
  box-sizing: border-box;
}
```

**Key Rules**:
- **Mobile**: Natural height, scrollable page
- **Desktop**: Fixed 100% height, no page scroll
- **Box Sizing**: `border-box` for predictable sizing

### 6.2 Grid Container Structure

```css
@media (min-width: 768px) {
  .restaurant-grid-container {
    display: grid;
    grid-template-rows: auto 1fr;  /* Header (auto) + Content (remaining) */
    height: 100vh;
    overflow: hidden;
  }

  .restaurant-content {
    display: grid;
    overflow: hidden;
  }

  .restaurant-content.desktop {
    grid-template-columns: 420px 1fr;  /* List (fixed) + Detail (flex) */
  }
}
```

**Grid Template Rows**:
- `auto`: Header takes natural height (48px)
- `1fr`: Content takes remaining height

**Grid Template Columns**:
- `420px`: Left panel fixed width
- `1fr`: Right panel takes remaining width

### 6.3 Scroll Area Styling

```css
@media (min-width: 768px) {
  .restaurant-scroll-area {
    overflow-y: auto;  /* Vertical scroll */
    height: 100%;      /* Fill grid cell */
  }
}
```

**Applied To**:
- Restaurant list container
- Restaurant detail container
- Review list container

---

## 7. Scroll Management

### 7.1 Desktop Scroll Strategy

**Pattern**: Independent scroll areas, no page scroll

```
Page (overflow: hidden)
├── Header (fixed, no scroll)
└── Content (grid)
    ├── Left Panel (overflow-y: auto)
    └── Right Panel (overflow-y: auto)
```

**Benefits**:
- Header always visible
- Panels scroll independently
- Better UX for split-panel layouts

**Implementation**:
```css
.restaurant-grid-container {
  overflow: hidden;  /* No page scroll */
}

.restaurant-scroll-area {
  overflow-y: auto;  /* Panel scroll */
}
```

### 7.2 Mobile Scroll Strategy

**Pattern**: Natural page scrolling

```
Page (overflow: auto)
├── Header (scrolls with page)
└── Content (natural flow)
    └── Single panel (scrolls with page)
```

**Benefits**:
- Familiar mobile UX
- No height restrictions
- Works well with browser UI (address bar hide/show)

**Implementation**:
```typescript
// No special scroll management needed
// Natural document flow
```

### 7.3 React Native Web ScrollView

**NOT Used** in current implementation

**Why?**
- CSS `overflow-y: auto` is simpler for web
- Better browser scrollbar integration
- No need for cross-platform scroll component

**When to Use ScrollView**:
- Need scroll event listeners
- Need scroll-to-top functionality
- Need momentum scrolling on iOS web

---

## 8. Best Practices

### 8.1 Use Conditional Rendering for Layouts

**❌ Bad** (CSS-only responsive):
```tsx
<div className="layout">
  <div className="sidebar">...</div>  {/* Hidden on mobile via CSS */}
  <div className="content">...</div>
</div>
```

**✅ Good** (Conditional rendering):
```tsx
{isMobile ? (
  <MobileLayout />
) : (
  <DesktopLayout />
)}
```

**Benefits**:
- Clear separation
- Different routing strategies
- Better performance (no hidden DOM)

### 8.2 Use CSS for Layout, Inline Styles for Colors

**❌ Bad** (hardcoded colors in CSS):
```css
.card {
  background-color: #FFFFFF;  /* Breaks dark mode */
}
```

**✅ Good** (CSS for layout, inline for colors):
```tsx
const colors = THEME_COLORS[theme]

<div className="card" style={{ backgroundColor: colors.surface }}>
```

### 8.3 Test Both Desktop and Mobile

**Quick Test** (Chrome DevTools):
1. Open DevTools (F12)
2. Toggle Device Toolbar (Ctrl+Shift+M)
3. Resize viewport to test breakpoint (768px)

**Real Device Test**:
1. Set `host: '0.0.0.0'` in `config/base.yml`
2. Access from mobile: `http://<YOUR_IP>:3000`

### 8.4 Avoid Fixed Heights on Mobile

**❌ Bad** (fixed height breaks mobile):
```css
.container {
  height: 100vh;  /* Breaks with browser UI */
}
```

**✅ Good** (natural height on mobile):
```css
@media (min-width: 768px) {
  .container {
    height: 100vh;  /* Only on desktop */
  }
}

/* Mobile uses natural height (no CSS) */
```

### 8.5 Use Semantic Class Names

**❌ Bad** (unclear purpose):
```tsx
<div className="layout1">
<div className="container-a">
```

**✅ Good** (clear purpose):
```tsx
<div className="restaurant-grid-container">
<div className="restaurant-scroll-area">
```

---

## 9. Related Documentation

### Web Documentation
- **[WEB-SETUP.md](./WEB-SETUP.md)**: Vite and TypeScript configuration
- **[WEB-THEME.md](./WEB-THEME.md)**: Theme system and color palette
- **[WEB-HEADER-DRAWER.md](./WEB-HEADER-DRAWER.md)**: Header and drawer components
- **[WEB-RESTAURANT.md](./WEB-RESTAURANT.md)**: Restaurant component implementation
- **[WEB-PATTERNS.md](./WEB-PATTERNS.md)**: React Native Web patterns

### Core Documentation
- **[ARCHITECTURE.md](../00-core/ARCHITECTURE.md)**: Overall project architecture
- **[DEVELOPMENT.md](../00-core/DEVELOPMENT.md)**: Development workflow

---

## Appendix: Layout Evolution

### Current Implementation
- Single breakpoint (768px)
- CSS Grid for desktop
- React Router for mobile toggle
- Independent scroll areas

### Future Enhancements
1. **Tablet Layout**: Middle breakpoint (768-1024px) with adjusted panel widths
2. **Responsive Sidebar**: Collapsible sidebar on medium screens
3. **Virtual Scrolling**: For very long lists (react-window)
4. **Smooth Transitions**: Animate layout changes on resize
5. **Flexible Breakpoints**: User-adjustable panel widths

---

**Document Version**: 1.0.0
**Covers Files**: `Restaurant.tsx`, `Home.tsx`, `index.css`, responsive layout patterns
