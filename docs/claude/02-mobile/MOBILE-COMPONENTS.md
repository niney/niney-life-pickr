# MOBILE-COMPONENTS.md

> **Last Updated**: 2025-10-23 22:30
> **Purpose**: Mobile-specific UI components (TabBarIcons, RecrawlModal)

---

## Table of Contents

1. [Overview](#1-overview)
2. [TabBarIcons Component](#2-tabbaricons-component)
3. [RecrawlModal Component](#3-recrawlmodal-component)
4. [Component Integration](#4-component-integration)
5. [Related Documentation](#5-related-documentation)

---

## 1. Overview

The mobile app uses two custom mobile-specific components that are not shared with the web application:

### Component List

#### 1. TabBarIcons (`TabBarIcons.tsx`)
- **Purpose**: Custom SVG icons for bottom tab navigation
- **Icons**: HomeIcon, RestaurantIcon, SettingsIcon
- **Lines**: 65
- **Tech**: react-native-svg

#### 2. RecrawlModal (`RecrawlModal.tsx`)
- **Purpose**: Modal dialog for recrawl options (menu, review, summary)
- **Features**: Custom checkboxes, conditional options, theme integration
- **Lines**: 184
- **Tech**: React Native Modal, TouchableOpacity

### File Location

**Location**: `apps/mobile/src/components/`

```
apps/mobile/src/components/
├── TabBarIcons.tsx    # Custom SVG icons (65 lines)
└── RecrawlModal.tsx   # Recrawl options modal (184 lines)
```

### Key Design Principles

1. **Theme Integration**: Both components use ThemeContext for color adaptation
2. **Cross-platform**: React Native components (no platform-specific code)
3. **Reusability**: Pure presentation components with callback props
4. **Accessibility**: TouchableOpacity with proper hitSlop and feedback

---

## 2. TabBarIcons Component

### 2.1 Overview

Custom SVG icons for the bottom tab navigator. Uses `react-native-svg` for vector graphics rendering.

**File**: `apps/mobile/src/components/TabBarIcons.tsx`

**Lines**: 65

### 2.2 Icon Components

#### IconProps Interface

```typescript
interface IconProps {
  size: number;
  color: string;
}
```

**Props**:
- `size`: Icon dimensions (width and height in pixels)
- `color`: Stroke color (from theme)

### 2.3 HomeIcon

**Design**: House with roof and door

```typescript
export const HomeIcon: React.FC<IconProps> = ({ size, color }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M9 22V12h6v10"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);
```

**Visual Elements**:
- **Outer shape**: House outline with sloped roof (path 1)
- **Inner detail**: Door/entrance (path 2)
- **Style**: Outlined (no fill), 2px stroke

### 2.4 RestaurantIcon

**Design**: Fork and knife utensils

```typescript
export const RestaurantIcon: React.FC<IconProps> = ({ size, color }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 002-2V2M7 2v20M21 15V2v0a2 2 0 00-2 2v9"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M19 22v-7"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);
```

**Visual Elements**:
- **Fork** (path 1): Three prongs with handle
- **Knife** (path 2): Blade with handle
- **Style**: Outlined, 2px stroke

### 2.5 SettingsIcon

**Design**: Gear/cog wheel with center circle

```typescript
export const SettingsIcon: React.FC<IconProps> = ({ size, color }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M12 15a3 3 0 100-6 3 3 0 000 6z"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);
```

**Visual Elements**:
- **Center circle** (path 1): 3-unit radius circle
- **Gear teeth** (path 2): Complex path forming 8 teeth around center
- **Style**: Outlined, 2px stroke

### 2.6 Usage in Navigation

**File**: `apps/mobile/src/navigation/BottomTabNavigator.tsx`

```typescript
import { HomeIcon, RestaurantIcon, SettingsIcon } from '../components/TabBarIcons';

<Tab.Navigator
  screenOptions={({ route }) => ({
    tabBarIcon: ({ focused, color, size }) => {
      if (route.name === 'Home') {
        return <HomeIcon size={size} color={color} />;
      } else if (route.name === 'Restaurant') {
        return <RestaurantIcon size={size} color={color} />;
      } else if (route.name === 'Settings') {
        return <SettingsIcon size={size} color={color} />;
      }
    },
  })}
>
  {/* Tab screens */}
</Tab.Navigator>
```

**Dynamic Props**:
- `size`: 24px (provided by React Navigation)
- `color`: Theme-aware (primary for focused, textSecondary for inactive)
- `focused`: Boolean indicating active tab

### 2.7 SVG Benefits

**Why SVG over Icon Fonts?**:
1. **Scalability**: Crisp rendering at any size
2. **Customization**: Full control over stroke, fill, paths
3. **Performance**: No font loading overhead
4. **Simplicity**: Self-contained (no external dependencies beyond react-native-svg)

**ViewBox Convention**:
- All icons use `viewBox="0 0 24 24"` (24x24 coordinate system)
- Allows consistent sizing across all icons

---

## 3. RecrawlModal Component

### 3.1 Overview

Modal dialog for selecting recrawl options with custom checkboxes and conditional UI.

**File**: `apps/mobile/src/components/RecrawlModal.tsx`

**Lines**: 184

**Features**:
- Custom checkbox components (no external library)
- Conditional option visibility (resetSummary only when createSummary is true)
- Theme integration with ThemeContext
- Disable button when no options selected
- State reset on close/confirm

### 3.2 Props Interface

```typescript
interface RecrawlModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: (options: {
    crawlMenus: boolean;
    crawlReviews: boolean;
    createSummary: boolean;
    resetSummary?: boolean;
  }) => void;
  restaurantName: string;
}
```

**Props**:
- `visible`: Modal visibility state (controlled by parent)
- `onClose`: Callback when modal is dismissed (cancel button or backdrop tap)
- `onConfirm`: Callback with selected options object
- `restaurantName`: Restaurant name for subtitle display

**Options Object**:
- `crawlMenus`: Re-crawl menu data from Naver
- `crawlReviews`: Re-crawl review data from Naver
- `createSummary`: Generate AI summary from reviews
- `resetSummary`: (Optional) Delete existing summaries before generating new ones

### 3.3 Component State

```typescript
const RecrawlModal: React.FC<RecrawlModalProps> = ({
  visible,
  onClose,
  onConfirm,
  restaurantName
}) => {
  const { theme } = useTheme();
  const colors = THEME_COLORS[theme];

  const [crawlMenus, setCrawlMenus] = useState(false);
  const [crawlReviews, setCrawlReviews] = useState(false);
  const [createSummary, setCreateSummary] = useState(false);
  const [resetSummary, setResetSummary] = useState(false);

  // ...
};
```

**State Variables**:
- `crawlMenus`: Checkbox state for menu crawling
- `crawlReviews`: Checkbox state for review crawling
- `createSummary`: Checkbox state for summary generation
- `resetSummary`: Checkbox state for summary reset (conditional)

### 3.4 Event Handlers

#### Confirm Handler

```typescript
const handleConfirm = () => {
  onConfirm({
    crawlMenus,
    crawlReviews,
    createSummary,
    resetSummary: createSummary && resetSummary  // Only pass if createSummary is true
  });
  onClose();
  // Reset all checkboxes
  setCrawlMenus(false);
  setCrawlReviews(false);
  setCreateSummary(false);
  setResetSummary(false);
};
```

**Flow**:
1. Call `onConfirm` with options object
2. Close modal via `onClose()`
3. Reset all checkbox states to false

**resetSummary Logic**: Only included in options when `createSummary` is true (prevents reset without generation)

#### Close Handler

```typescript
const handleClose = () => {
  onClose();
  // Reset all checkboxes
  setCrawlMenus(false);
  setCrawlReviews(false);
  setCreateSummary(false);
  setResetSummary(false);
};
```

**Flow**: Same as confirm, but without calling `onConfirm` (cancel action)

### 3.5 Modal Structure

```typescript
<Modal
  visible={visible}
  transparent
  animationType="fade"
  onRequestClose={handleClose}
>
  <View style={styles.overlay}>
    <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
      {/* Title */}
      <Text style={[styles.title, { color: colors.text }]}>재크롤링</Text>
      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
        {restaurantName}
      </Text>

      {/* Options */}
      <View style={styles.optionsContainer}>
        {/* Checkboxes */}
      </View>

      {/* Buttons */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity onPress={handleClose}>
          <Text>취소</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={handleConfirm}
          disabled={!crawlMenus && !crawlReviews && !createSummary}
        >
          <Text>확인</Text>
        </TouchableOpacity>
      </View>
    </View>
  </View>
</Modal>
```

**Props**:
- `transparent`: Allows semi-transparent overlay
- `animationType="fade"`: Fade-in/out animation
- `onRequestClose`: Android back button handler (calls `handleClose`)

### 3.6 Custom Checkbox Implementation

#### Checkbox Row

```typescript
<TouchableOpacity
  style={styles.checkboxRow}
  onPress={() => setCrawlMenus(!crawlMenus)}
>
  <View style={[styles.checkbox, { borderColor: colors.border }]}>
    {crawlMenus && (
      <View style={[styles.checkboxInner, { backgroundColor: colors.primary }]} />
    )}
  </View>
  <Text style={[styles.checkboxLabel, { color: colors.text }]}>
    메뉴 크롤링
  </Text>
</TouchableOpacity>
```

**Structure**:
- **Outer View**: Border box (24x24px)
- **Inner View**: Filled square (14x14px, only rendered when checked)
- **Label**: Text next to checkbox

**Styling**:
```typescript
checkbox: {
  width: 24,
  height: 24,
  borderRadius: 6,
  borderWidth: 2,
  justifyContent: 'center',
  alignItems: 'center',
  marginRight: 12,
},
checkboxInner: {
  width: 14,
  height: 14,
  borderRadius: 3,
},
```

**Visual States**:
- **Unchecked**: Empty border box with theme border color
- **Checked**: Border box + filled inner square (primary color)

### 3.7 Conditional Option (Reset Summary)

```typescript
{createSummary && (
  <TouchableOpacity
    style={[styles.checkboxRow, styles.resetSummaryRow]}
    onPress={() => setResetSummary(!resetSummary)}
  >
    <View style={[styles.checkbox, { borderColor: colors.border }]}>
      {resetSummary && (
        <View style={[styles.checkboxInner, { backgroundColor: colors.primary }]} />
      )}
    </View>
    <View style={styles.resetSummaryContent}>
      <Text style={[styles.checkboxLabel, { color: colors.text }]}>
        기존 요약 지우고 다시 생성
      </Text>
      <Text style={[styles.resetSummaryDescription, { color: colors.textSecondary }]}>
        모든 요약을 삭제한 후 처음부터 생성합니다
      </Text>
    </View>
  </TouchableOpacity>
)}
```

**Conditional Rendering**: Only shown when `createSummary` is true

**Visual Styling**:
```typescript
resetSummaryRow: {
  paddingLeft: 8,
  borderLeftWidth: 2,
  borderLeftColor: 'rgba(0, 0, 0, 0.1)',
  marginTop: 8,
  paddingTop: 12,
  paddingBottom: 4,
},
```

**Effect**: Indented with left border to indicate sub-option relationship

**Description**: Two-line layout with primary label and secondary description text

### 3.8 Button Container

```typescript
<View style={styles.buttonContainer}>
  <TouchableOpacity
    style={[
      styles.button,
      {
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.border
      }
    ]}
    onPress={handleClose}
  >
    <Text style={[styles.buttonText, { color: colors.text }]}>
      취소
    </Text>
  </TouchableOpacity>

  <TouchableOpacity
    style={[styles.button, { backgroundColor: colors.primary }]}
    onPress={handleConfirm}
    disabled={!crawlMenus && !crawlReviews && !createSummary}
  >
    <Text
      style={[
        styles.buttonText,
        {
          color: '#fff',
          opacity: !crawlMenus && !crawlReviews && !createSummary ? 0.5 : 1
        }
      ]}
    >
      확인
    </Text>
  </TouchableOpacity>
</View>
```

**Layout**:
```typescript
buttonContainer: {
  flexDirection: 'row',
  gap: 12,
},
button: {
  flex: 1,
  paddingVertical: 14,
  borderRadius: 10,
  alignItems: 'center',
},
```

**Visual Design**:
- **Cancel Button**: Surface background with border (subtle)
- **Confirm Button**: Primary color background (prominent)
- **Disabled State**: 50% opacity when no options selected

**Disabled Logic**: Confirm button is disabled (`TouchableOpacity.disabled`) when ALL checkboxes are false

### 3.9 Styling Summary

```typescript
const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '85%',
    maxWidth: 400,
    borderRadius: 16,
    padding: 24,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    marginBottom: 24,
  },
  optionsContainer: {
    marginBottom: 24,
  },
  // ... (checkboxes, buttons)
});
```

**Key Dimensions**:
- **Modal Width**: 85% of screen width, max 400px
- **Border Radius**: 16px for modal, 10px for buttons, 6px for checkboxes
- **Padding**: 24px for modal content, 14px vertical for buttons
- **Gap**: 12px between buttons, 16px between checkbox rows

---

## 4. Component Integration

### 4.1 TabBarIcons Usage

**Used In**: `apps/mobile/src/navigation/BottomTabNavigator.tsx`

```typescript
import { HomeIcon, RestaurantIcon, SettingsIcon } from '../components/TabBarIcons';

<Tab.Navigator
  screenOptions={({ route }) => ({
    tabBarIcon: ({ focused, color, size }) => {
      let IconComponent;

      if (route.name === 'Home') {
        IconComponent = HomeIcon;
      } else if (route.name === 'Restaurant') {
        IconComponent = RestaurantIcon;
      } else if (route.name === 'Settings') {
        IconComponent = SettingsIcon;
      }

      return <IconComponent size={size} color={color} />;
    },
    tabBarActiveTintColor: colors.primary,
    tabBarInactiveTintColor: colors.textSecondary,
  })}
>
  {/* Tab screens */}
</Tab.Navigator>
```

**Integration Points**:
- React Navigation provides `focused`, `color`, `size` props
- Color is controlled by `tabBarActiveTintColor` and `tabBarInactiveTintColor`
- Size defaults to 24px (React Navigation standard)

### 4.2 RecrawlModal Usage

**Used In**: `apps/mobile/src/screens/RestaurantListScreen.tsx`

```typescript
import RecrawlModal from '../components/RecrawlModal';

const RestaurantListScreen: React.FC = () => {
  const [recrawlModalVisible, setRecrawlModalVisible] = useState(false);
  const [selectedRestaurant, setSelectedRestaurant] = useState<RestaurantData | null>(null);

  const handleRecrawlPress = (restaurant: RestaurantData) => {
    setSelectedRestaurant(restaurant);
    setRecrawlModalVisible(true);
  };

  const handleRecrawlConfirm = async (options: {
    crawlMenus: boolean;
    crawlReviews: boolean;
    createSummary: boolean;
    resetSummary?: boolean;
  }) => {
    if (!selectedRestaurant) return;

    // Call API with options
    await handleRecrawl(selectedRestaurant, options);
  };

  return (
    <>
      {/* Restaurant list */}
      <RecrawlModal
        visible={recrawlModalVisible}
        onClose={() => setRecrawlModalVisible(false)}
        onConfirm={handleRecrawlConfirm}
        restaurantName={selectedRestaurant?.name || ''}
      />
    </>
  );
};
```

**Flow**:
1. User taps recrawl button on restaurant card
2. `handleRecrawlPress()` sets selected restaurant + shows modal
3. User selects options and taps "확인"
4. `handleRecrawlConfirm()` called with options object
5. Modal closes and API call is made

### 4.3 Theme Integration

Both components use `useTheme` hook for color adaptation:

```typescript
import { useTheme } from 'shared/contexts';
import { THEME_COLORS } from 'shared/constants';

const { theme } = useTheme();
const colors = THEME_COLORS[theme];
```

**RecrawlModal Theme Colors**:
- `surface`: Modal background
- `text`: Title, labels
- `textSecondary`: Subtitle, description
- `border`: Checkbox border, cancel button border
- `primary`: Checkbox fill, confirm button background

**TabBarIcons Theme Colors**:
- Passed dynamically from React Navigation
- `primary`: Active tab icon
- `textSecondary`: Inactive tab icon

---

## 5. Related Documentation

### Mobile Documentation
- **[MOBILE-NAVIGATION.md](./MOBILE-NAVIGATION.md)**: Bottom Tab Navigator (TabBarIcons usage)
- **[MOBILE-RESTAURANT-LIST.md](./MOBILE-RESTAURANT-LIST.md)**: RecrawlModal usage
- **[MOBILE-HOME.md](./MOBILE-HOME.md)**: Home screen design patterns
- **[MOBILE-TESTING.md](./MOBILE-TESTING.md)**: Maestro E2E tests

### Shared Documentation
- **[SHARED-CONTEXTS.md](../03-shared/SHARED-CONTEXTS.md)**: ThemeContext (useTheme hook)
- **[SHARED-CONSTANTS.md](../03-shared/SHARED-CONSTANTS.md)**: THEME_COLORS

### Core Documentation
- **[ARCHITECTURE.md](../00-core/ARCHITECTURE.md)**: Component architecture
- **[DEVELOPMENT.md](../00-core/DEVELOPMENT.md)**: Development workflow

---

## Appendix: Component Comparison

### TabBarIcons vs Web Icons

**Web** (`apps/web/src/components/Header.tsx`):
- Uses `@fortawesome/react-fontawesome` icon library
- FontAwesome icons: `faBars`, `faMoon`, `faSun`, `faUser`
- No custom SVG icons

**Mobile** (`apps/mobile/src/components/TabBarIcons.tsx`):
- Custom SVG icons: `HomeIcon`, `RestaurantIcon`, `SettingsIcon`
- No icon library dependency (except react-native-svg)
- Full control over paths, stroke, fill

### RecrawlModal vs Web Dialog

**Web** (`apps/web/src/components/Restaurant.tsx`):
- Inline form (no modal)
- Checkboxes for menu/review/summary options
- HTML `<input type="checkbox">`

**Mobile** (`apps/mobile/src/components/RecrawlModal.tsx`):
- Full-screen modal with overlay
- Custom checkbox components (View + TouchableOpacity)
- React Native Modal with fade animation

---

## Appendix: Custom Checkbox Design

### Why Custom Checkboxes?

React Native does not have a built-in checkbox component (unlike HTML). Options:
1. **External Library**: `@react-native-community/checkbox` (platform-specific styling)
2. **Custom Implementation**: Full control over appearance (chosen approach)

### Custom Checkbox Advantages
- **Consistent Design**: Identical appearance on iOS and Android
- **Theme Integration**: Directly uses theme colors
- **Simplicity**: No external dependency
- **Customization**: Easy to modify size, shape, colors

### Implementation Pattern

```typescript
// Outer container (border)
<View style={[styles.checkbox, { borderColor: colors.border }]}>
  {/* Inner fill (conditional) */}
  {isChecked && (
    <View style={[styles.checkboxInner, { backgroundColor: colors.primary }]} />
  )}
</View>
```

**Styling**:
```typescript
checkbox: {
  width: 24,
  height: 24,
  borderRadius: 6,    // Rounded square
  borderWidth: 2,
  justifyContent: 'center',
  alignItems: 'center',
},
checkboxInner: {
  width: 14,
  height: 14,
  borderRadius: 3,    // Slightly rounded fill
},
```

**Visual Result**:
- **Unchecked**: ◻️ Empty square with border
- **Checked**: ☑️ Square with filled center

---

**Document Version**: 1.0.0
**Covers Files**: `TabBarIcons.tsx`, `RecrawlModal.tsx`, custom SVG icons, modal patterns
