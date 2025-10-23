# SHARED-COMPONENTS.md

> **Last Updated**: 2025-10-23 22:40
> **Purpose**: Cross-platform UI components shared between web and mobile apps

---

## Table of Contents

1. [Overview](#1-overview)
2. [Button Component](#2-button-component)
3. [InputField Component](#3-inputfield-component)
4. [Barrel Export Pattern](#4-barrel-export-pattern)
5. [Usage Examples](#5-usage-examples)
6. [Cross-Platform Considerations](#6-cross-platform-considerations)
7. [Related Documentation](#7-related-documentation)

---

## 1. Overview

The shared components module provides reusable, cross-platform UI components that work identically on both web (React Native Web) and mobile (React Native) platforms.

### Component List

**Location**: `apps/shared/components/`

```
apps/shared/components/
├── Button.tsx       # Cross-platform button (92 lines)
├── InputField.tsx   # Cross-platform input field (78 lines)
└── index.ts         # Barrel export (3 lines)
```

### Design Principles

1. **Cross-Platform Compatibility**: Components use React Native primitives that work on web via React Native Web
2. **Prop Consistency**: Same API across platforms (no platform-specific props)
3. **Style Customization**: Accept `style` props for per-use customization
4. **Accessibility**: Use semantic components (TouchableOpacity, TextInput)
5. **Type Safety**: Full TypeScript definitions with exported prop types

### Import Pattern

**Web** (`apps/web/src/components/Login.tsx`):
```typescript
import { Button, InputField } from '@shared/components';
```

**Mobile** (`apps/mobile/src/screens/LoginScreen.tsx`):
```typescript
import { Button, InputField } from 'shared/components';
```

---

## 2. Button Component

### 2.1 Overview

A customizable button component with multiple variants, loading state, and disabled state.

**File**: `apps/shared/components/Button.tsx`

**Lines**: 92

### 2.2 Props Interface

```typescript
interface ButtonProps {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'outline';
  style?: ViewStyle;
  textStyle?: TextStyle;
}
```

**Props**:
- `title`: Button text (required)
- `onPress`: Click/tap handler (required)
- `loading`: Shows ActivityIndicator instead of text (default: `false`)
- `disabled`: Disables button interaction (default: `false`)
- `variant`: Visual style variant (default: `'primary'`)
- `style`: Custom container styles (merges with variant styles)
- `textStyle`: Custom text styles (merges with variant text styles)

### 2.3 Component Implementation

```typescript
const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  loading = false,
  disabled = false,
  variant = 'primary',
  style,
  textStyle,
}) => {
  const isDisabled = disabled || loading;

  return (
    <TouchableOpacity
      style={[
        styles.button,
        styles[variant],
        isDisabled && styles.disabled,
        style,
      ]}
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.8}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'outline' ? '#667eea' : 'white'} />
      ) : (
        <Text style={[styles.text, styles[`${variant}Text`], textStyle]}>
          {title}
        </Text>
      )}
    </TouchableOpacity>
  );
};
```

**Key Logic**:
- `isDisabled = disabled || loading`: Button is disabled if explicitly disabled OR loading
- Style array: `[base, variant, disabled, custom]` (later styles override earlier)
- Conditional render: ActivityIndicator when loading, Text otherwise
- `activeOpacity={0.8}`: Visual feedback on press (slight transparency)

### 2.4 Variants

#### Primary (Default)

```typescript
primary: {
  backgroundColor: '#667eea',
},
primaryText: {
  color: 'white',
},
```

**Visual**: Purple background (#667eea), white text

**Usage**: Main call-to-action buttons (Login, Submit, Confirm)

#### Secondary

```typescript
secondary: {
  backgroundColor: '#4a5568',
},
secondaryText: {
  color: 'white',
},
```

**Visual**: Gray background (#4a5568), white text

**Usage**: Secondary actions (Cancel, Back)

#### Outline

```typescript
outline: {
  backgroundColor: 'transparent',
  borderWidth: 2,
  borderColor: '#667eea',
},
outlineText: {
  color: '#667eea',
},
```

**Visual**: Transparent background, purple border and text

**Usage**: Tertiary actions (Optional features, Alternative paths)

### 2.5 States

#### Normal State

```typescript
<Button title="로그인" onPress={handleLogin} />
```

**Visual**: Full opacity, normal colors

#### Loading State

```typescript
<Button title="로그인" onPress={handleLogin} loading={true} />
```

**Visual**:
- Replaces text with ActivityIndicator (spinner)
- Button is disabled (no interaction)
- Spinner color: white (primary/secondary), purple (outline)

#### Disabled State

```typescript
<Button title="로그인" onPress={handleLogin} disabled={true} />
```

**Visual**:
- 50% opacity (`styles.disabled`)
- No interaction (onPress ignored)

### 2.6 Styling

```typescript
const styles = StyleSheet.create({
  button: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  disabled: {
    opacity: 0.5,
  },
  text: {
    fontSize: 16,
    fontWeight: '600',
  },
});
```

**Base Styles**:
- **Padding**: 12px vertical, 24px horizontal
- **Border Radius**: 8px (rounded corners)
- **Min Height**: 48px (accessibility guideline for touch targets)
- **Alignment**: Center text horizontally and vertically

**Disabled Style**: 50% opacity overlay

---

## 3. InputField Component

### 3.1 Overview

A text input component with optional label, error message, and required indicator.

**File**: `apps/shared/components/InputField.tsx`

**Lines**: 78

### 3.2 Props Interface

```typescript
interface InputFieldProps extends TextInputProps {
  label?: string;
  error?: string;
  containerStyle?: ViewStyle;
  required?: boolean;
}
```

**Props**:
- `label`: Label text above input (optional)
- `error`: Error message below input (optional, shows red border when present)
- `containerStyle`: Custom styles for outer container (optional)
- `required`: Shows red asterisk next to label (optional, default: `false`)
- `...inputProps`: All standard TextInput props (placeholder, value, onChangeText, etc.)

**Extends TextInputProps**: Accepts all React Native TextInput props via spread operator

### 3.3 Component Implementation

```typescript
const InputField: React.FC<InputFieldProps> = ({
  label,
  error,
  containerStyle,
  required = false,
  ...inputProps
}) => {
  return (
    <View style={[styles.container, containerStyle]}>
      {label && (
        <Text style={styles.label}>
          {label}
          {required && <Text style={styles.required}> *</Text>}
        </Text>
      )}
      <TextInput
        style={[
          styles.input,
          error && styles.inputError,
        ]}
        placeholderTextColor="#9ca3af"
        {...inputProps}
      />
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
};
```

**Structure**:
1. **Container**: Outer View with margin-bottom spacing
2. **Label** (conditional): Text with optional red asterisk
3. **TextInput**: Styled input with error border when error exists
4. **Error Text** (conditional): Red error message below input

**Conditional Rendering**:
- Label: Only rendered if `label` prop provided
- Required asterisk: Only rendered if `required={true}`
- Error text: Only rendered if `error` prop provided
- Error border: Applied to input when `error` exists

### 3.4 Usage Patterns

#### Basic Input

```typescript
<InputField
  placeholder="이메일을 입력하세요"
  value={email}
  onChangeText={setEmail}
/>
```

**Visual**: Input field with gray border, gray placeholder

#### With Label

```typescript
<InputField
  label="이메일"
  placeholder="이메일을 입력하세요"
  value={email}
  onChangeText={setEmail}
/>
```

**Visual**: "이메일" label above input field

#### Required Field

```typescript
<InputField
  label="이메일"
  required
  placeholder="이메일을 입력하세요"
  value={email}
  onChangeText={setEmail}
/>
```

**Visual**: "이메일 *" (red asterisk) above input

#### With Error

```typescript
<InputField
  label="이메일"
  placeholder="이메일을 입력하세요"
  value={email}
  onChangeText={setEmail}
  error="유효한 이메일을 입력하세요"
/>
```

**Visual**:
- Input border: Red (#ef4444)
- Error text: Red text below input ("유효한 이메일을 입력하세요")

### 3.5 Styling

```typescript
const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 4,
  },
  required: {
    color: '#ef4444',
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: '#111827',
    backgroundColor: 'white',
  },
  inputError: {
    borderColor: '#ef4444',
  },
  errorText: {
    fontSize: 12,
    color: '#ef4444',
    marginTop: 4,
  },
});
```

**Key Styles**:
- **Container**: 16px bottom margin for spacing between fields
- **Label**: 14px font, medium weight, dark gray
- **Required**: Red color (#ef4444)
- **Input**: 1px gray border, 6px border radius, 16px font, white background
- **Input Error**: Red border override when error exists
- **Error Text**: 12px font, red color, 4px top margin

---

## 4. Barrel Export Pattern

### 4.1 Index File

**File**: `apps/shared/components/index.ts`

```typescript
export { default as Button } from './Button';
export { default as InputField } from './InputField';
```

**Pattern**: Named exports for each component

### 4.2 Benefits

1. **Clean Imports**: Single import line for multiple components
   ```typescript
   import { Button, InputField } from '@shared/components';
   ```
   vs.
   ```typescript
   import Button from '@shared/components/Button';
   import InputField from '@shared/components/InputField';
   ```

2. **Encapsulation**: Internal file structure hidden from consumers

3. **Easy Refactoring**: Move/rename files without affecting import statements

4. **Discoverability**: IDE autocomplete shows all available components after typing `import { } from '@shared/components'`

---

## 5. Usage Examples

### 5.1 Web Login Form (WEB)

**File**: `apps/web/src/components/Login.tsx`

```typescript
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Button, InputField } from '@shared/components';
import { useLogin } from '@shared/hooks';

const Login: React.FC = () => {
  const { email, setEmail, password, setPassword, handleLogin, loading } = useLogin();

  return (
    <View style={styles.container}>
      <InputField
        label="이메일"
        placeholder="이메일을 입력하세요"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />
      <InputField
        label="비밀번호"
        placeholder="비밀번호를 입력하세요"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />
      <Button
        title="로그인"
        onPress={handleLogin}
        loading={loading}
      />
    </View>
  );
};
```

### 5.2 Mobile Login Screen (MOBILE)

**File**: `apps/mobile/src/screens/LoginScreen.tsx`

```typescript
import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Button, InputField } from 'shared/components';
import { useLogin } from 'shared/hooks';

const LoginScreen: React.FC = () => {
  const { email, setEmail, password, setPassword, handleLogin, loading } = useLogin();

  return (
    <ScrollView style={styles.container}>
      <InputField
        label="이메일"
        placeholder="이메일을 입력하세요"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />
      <InputField
        label="비밀번호"
        placeholder="비밀번호를 입력하세요"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />
      <Button
        title="로그인"
        onPress={handleLogin}
        loading={loading}
      />
    </ScrollView>
  );
};
```

**Note**: Identical component usage, only difference is import path (`@shared` vs `shared`)

---

## 6. Cross-Platform Considerations

### 6.1 React Native Primitives

**Components Used**:
- `View`: Container (works on web and mobile)
- `Text`: Text rendering (styled text on both platforms)
- `TextInput`: Input field (HTML input on web, native input on mobile)
- `TouchableOpacity`: Button wrapper (div with click on web, native touch on mobile)
- `ActivityIndicator`: Loading spinner (CSS animation on web, native spinner on mobile)

**Why These?**: React Native Web provides web implementations of these primitives

### 6.2 Styling with StyleSheet.create()

```typescript
const styles = StyleSheet.create({
  button: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
});
```

**Benefits**:
- **Cross-Platform**: Same syntax for web and mobile
- **Type Safety**: TypeScript validates style properties
- **Performance**: React Native Web converts to CSS classes

**Limitations**:
- No CSS-specific properties (no `display: grid`, no `box-shadow`)
- No pseudo-classes (no `:hover`, no `:focus`)

### 6.3 Color Consistency

All colors use hex codes for cross-platform compatibility:
```typescript
backgroundColor: '#667eea'  // Works everywhere
color: '#111827'            // Works everywhere
```

**Avoid**:
```typescript
color: 'darkgray'  // May render differently across platforms
```

### 6.4 Accessibility

**Touch Target Size**: Minimum 48px height for buttons
```typescript
minHeight: 48,
```

**Reason**: WCAG 2.1 guideline for mobile accessibility

**Placeholder Color**: Explicit `placeholderTextColor` prop
```typescript
<TextInput placeholderTextColor="#9ca3af" />
```

**Reason**: Default placeholder color varies by platform

---

## 7. Related Documentation

### Shared Documentation
- **[SHARED-OVERVIEW.md](./SHARED-OVERVIEW.md)**: Shared module architecture
- **[SHARED-HOOKS.md](./SHARED-HOOKS.md)**: useLogin hook (used with these components)
- **[SHARED-CONSTANTS.md](./SHARED-CONSTANTS.md)**: THEME_COLORS (future theme integration)

### Web Documentation
- **[WEB-LOGIN.md](../01-web/WEB-LOGIN.md)**: Web login form using these components
- **[WEB-PATTERNS.md](../01-web/WEB-PATTERNS.md)**: Cross-platform patterns

### Mobile Documentation
- **[MOBILE-LOGIN.md](../02-mobile/MOBILE-LOGIN.md)**: Mobile login screen using these components
- **[MOBILE-COMPONENTS.md](../02-mobile/MOBILE-COMPONENTS.md)**: Mobile-specific components (comparison)

### Core Documentation
- **[ARCHITECTURE.md](../00-core/ARCHITECTURE.md)**: Overall architecture
- **[DEVELOPMENT.md](../00-core/DEVELOPMENT.md)**: Development workflow

---

## Appendix: Future Enhancements

### Planned Features

1. **Theme Integration**: Use ThemeContext for colors
   ```typescript
   const { theme } = useTheme();
   const colors = THEME_COLORS[theme];
   backgroundColor: colors.primary
   ```

2. **Icon Support**: Add optional icon prop to Button
   ```typescript
   <Button title="Login" onPress={handleLogin} icon={<LoginIcon />} />
   ```

3. **Input Variants**: Add outlined, filled, underlined variants
   ```typescript
   <InputField variant="outlined" />
   ```

4. **Validation**: Built-in validation rules
   ```typescript
   <InputField validate="email" />
   ```

5. **Additional Components**:
   - Checkbox
   - Radio Button
   - Select/Dropdown
   - Switch/Toggle
   - Card Container

---

## Appendix: Component Testing

### Web (Playwright)

```typescript
// apps/web/e2e/login.spec.ts
test('login form renders correctly', async ({ page }) => {
  await page.goto('/');

  // Check InputField labels
  await expect(page.getByText('이메일')).toBeVisible();
  await expect(page.getByText('비밀번호')).toBeVisible();

  // Check Button
  await expect(page.getByText('로그인')).toBeVisible();
});
```

### Mobile (Maestro)

```yaml
# apps/mobile/.maestro/login.yaml
- assertVisible: "이메일"
- assertVisible: "비밀번호"
- assertVisible: "로그인"

- tapOn: "이메일을 입력하세요"
- inputText: "test@example.com"

- tapOn: "로그인"
```

---

**Document Version**: 1.0.0
**Covers Files**: `Button.tsx`, `InputField.tsx`, cross-platform component patterns
