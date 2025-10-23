# React Native Web 제약사항 및 해결 패턴

> **Last Updated**: 2025-10-23
> **Purpose**: React Native Web 사용 시 주의사항, 제약사항, 해결 패턴

---

## 목차

1. [React Native Web 개요](#1-react-native-web-개요)
2. [StyleSheet 제약사항](#2-stylesheet-제약사항)
3. [반응형 레이아웃 패턴](#3-반응형-레이아웃-패턴)
4. [스크롤 관리 패턴](#4-스크롤-관리-패턴)
5. [컴포넌트 선택 가이드](#5-컴포넌트-선택-가이드)
6. [핵심 원칙](#6-핵심-원칙)
7. [관련 문서](#7-관련-문서)

---

> **IMPORTANT**: React Native Web은 강력한 크로스 플랫폼 도구이지만, **CSS 문자열 값(`'100vh'`, `'calc()'`), Media queries, 일부 position 속성**에서 제약이 있습니다. 이 문서의 해결 패턴을 숙지하지 않으면 레이아웃 버그가 발생할 수 있습니다.

## 1. React Native Web 개요

### 1.1 React Native Web이란?

**React Native Web**은 React Native 코드를 웹 브라우저에서 실행할 수 있게 해주는 라이브러리입니다.

#### 1.1.1 장점
- ✅ Web과 Mobile 간 코드 공유
- ✅ React Native 컴포넌트 사용 가능 (View, Text, StyleSheet 등)
- ✅ Cross-platform 개발 효율성

#### 1.1.2 단점
- ❌ CSS 문자열 값 미지원 (`'100vh'`, `'calc()'` 등)
- ❌ Media queries in StyleSheet 미지원
- ❌ 일부 CSS 기능 제한적

### 1.2 프로젝트에서의 사용

#### 1.2.1 Vite Alias 설정
```typescript
// vite.config.ts
export default defineConfig({
  resolve: {
    alias: {
      'react-native': 'react-native-web'
    }
  }
})
```

#### 1.2.2 Import 방식
```typescript
// React Native 컴포넌트 import (자동으로 react-native-web으로 변환)
import { View, Text, StyleSheet, ScrollView } from 'react-native'
```

---

## 2. StyleSheet 제약사항

### 2.1 CSS 문자열 값 불가

#### 2.1.1 문제점
React Native Web의 `StyleSheet.create()`는 CSS 문자열 값(`'100vh'`, `'calc()'` 등)을 **지원하지 않습니다**.

#### 2.1.2 ❌ 잘못된 예시
```typescript
// ❌ TypeScript 에러 발생
const styles = StyleSheet.create({
  container: {
    minHeight: '100vh',  // Error: Type 'string' is not assignable to type number
    width: 'calc(100% - 20px)',  // Error
    height: '50%'  // Error
  }
})
```

#### 2.1.3 ✅ 해결 방법 1: 인라인 스타일
```typescript
// ✅ 인라인 스타일 사용 (타입 체크 우회)
<View style={{ minHeight: '100vh' as any }}>
  <Content />
</View>

// 또는 더 타입 안전하게
<View style={{ minHeight: '100vh' } as React.CSSProperties}>
  <Content />
</View>
```

#### 2.1.4 ✅ 해결 방법 2: HTML div 사용
```typescript
// ✅ HTML div 요소 사용 (CSS 문자열 값 가능)
<div className="page-container" style={{ minHeight: '100vh', backgroundColor: colors.background }}>
  <Header />
  <Content />
</div>
```

```css
/* index.css */
.page-container {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}
```

### 2.2 Media Queries 불가

#### 2.2.1 문제점
`@media` 쿼리는 `StyleSheet.create()`에서 **동작하지 않습니다**.

#### 2.2.2 ❌ 잘못된 예시
```typescript
// ❌ 작동하지 않음
const styles = StyleSheet.create({
  container: {
    width: 300,
    '@media (max-width: 768px)': {  // 무시됨
      width: 200
    }
  }
})
```

#### 2.2.3 ✅ 해결 방법: State 기반 반응형
```typescript
// ✅ window.innerWidth + resize 이벤트 리스너
const [isMobile, setIsMobile] = useState(window.innerWidth < 768)

useEffect(() => {
  const handleResize = () => {
    setIsMobile(window.innerWidth < 768)
  }

  window.addEventListener('resize', handleResize)
  return () => window.removeEventListener('resize', handleResize)
}, [])

// 조건부 스타일 적용
<View style={[styles.container, isMobile && styles.mobileContainer]}>
  <Content />
</View>
```

### 2.3 Position Absolute/Fixed 제한

#### 2.3.1 문제점
React Native Web에서 `position: 'absolute'` 또는 `position: 'fixed'`가 제한적으로 동작합니다.

#### 2.3.2 ✅ 해결 방법: HTML div 사용
```typescript
// ✅ HTML div로 모바일 전체 화면 패널 구현
<div
  className="mobile-review-panel"
  style={{
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.background,
    zIndex: 1000
  }}
>
  <ReviewPanel />
</div>
```

---

## 3. 반응형 레이아웃 패턴

### 3.1 조건부 렌더링 (Desktop/Mobile 완전 분리)

#### 3.1.1 권장 패턴
Desktop과 Mobile 레이아웃을 **완전히 분리**하여 조건부 렌더링합니다.

```typescript
// ✅ 조건부 렌더링으로 데스크탑/모바일 완전 분리
const [isMobile, setIsMobile] = useState(window.innerWidth < 768)

useEffect(() => {
  const handleResize = () => {
    setIsMobile(window.innerWidth < 768)
  }

  window.addEventListener('resize', handleResize)
  return () => window.removeEventListener('resize', handleResize)
}, [])

return (
  <>
    {isMobile ? (
      <MobileLayout />
    ) : (
      <DesktopLayout />
    )}
  </>
)
```

#### 3.1.2 Desktop Layout 예시
```typescript
// ✅ Desktop: 왼쪽 390px 고정 + 오른쪽 flex
function DesktopLayout() {
  return (
    <div style={{ display: 'flex', height: '100vh' }}>
      {/* Left Panel - Fixed 390px */}
      <div style={{ width: 390, flexShrink: 0, overflow: 'auto', backgroundColor: colors.surface }}>
        <RestaurantList />
      </div>

      {/* Right Panel - Flex */}
      <div style={{ flex: 1, overflow: 'auto', backgroundColor: colors.background }}>
        <ReviewPanel />
      </div>
    </div>
  )
}
```

#### 3.1.3 Mobile Layout 예시
```typescript
// ✅ Mobile: 전체 화면 토글 (목록 ↔ 리뷰)
function MobileLayout() {
  const [showReviewPanel, setShowReviewPanel] = useState(false)

  return (
    <>
      {showReviewPanel ? (
        <div style={{ width: '100%', height: '100vh' }}>
          <ReviewPanel onClose={() => setShowReviewPanel(false)} />
        </div>
      ) : (
        <div style={{ width: '100%', height: '100vh' }}>
          <RestaurantList onSelect={() => setShowReviewPanel(true)} />
        </div>
      )}
    </>
  )
}
```

### 3.2 HTML div vs React Native View

#### 3.2.1 사용 기준
```typescript
// ✅ React Native View는 CSS 문자열 값 불가 - HTML div 사용
<div className="page-container" style={{ backgroundColor: colors.background }}>
  <Header />
  <Content />
</div>

// ✅ React Native View는 숫자 값만 사용 가능
<View style={{ padding: 16, backgroundColor: colors.background }}>
  <Text>Content</Text>
</View>
```

#### 3.2.2 선택 가이드
| 조건 | 사용 컴포넌트 | 이유 |
|------|--------------|------|
| CSS 문자열 값 필요 (`'100vh'`, `'calc()'`) | HTML `<div>` | RN View는 문자열 미지원 |
| Position absolute/fixed 필요 | HTML `<div>` | RN Web에서 제한적 |
| Media queries 필요 | HTML `<div>` + CSS | RN StyleSheet 미지원 |
| 숫자 값만 사용 (padding: 16) | RN `<View>` | Cross-platform 호환성 |
| 텍스트 표시 | RN `<Text>` | 필수 (Web에서도) |

---

## 4. 스크롤 관리 패턴

### 4.1 문제점

React Native Web 환경에서 복잡한 레이아웃(flex, overflow, min-height 등)과 `window.scrollTo()`를 함께 사용하면 **스크롤 초기화가 불안정**합니다.

### 4.2 ❌ 잘못된 방법

```typescript
// ❌ 복잡한 레이아웃과 함께 사용하면 작동 불안정
useEffect(() => {
  window.scrollTo(0, 0)
  document.body.scrollTop = 0
  document.documentElement.scrollTop = 0
}, [])

// CSS
.content-scroll {
  overflow: auto;
  min-height: 100vh;
}
```

### 4.3 ✅ 올바른 방법: ScrollView 사용

#### 4.3.1 React Native의 ScrollView
```typescript
// ✅ React Native Web의 ScrollView 사용 (자동 스크롤 초기화)
import { ScrollView, View, StyleSheet } from 'react-native'

return (
  <View style={{ flex: 1 }}>
    <Header />
    <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
      <RestaurantList />
      <ReviewPanel />
      {/* 콘텐츠 */}
    </ScrollView>
  </View>
)

const styles = StyleSheet.create({
  scrollView: {
    flex: 1
  },
  scrollContent: {
    padding: 16
  }
})
```

#### 4.3.2 장점
- ✅ 자동 스크롤 초기화 (컴포넌트 마운트 시)
- ✅ 복잡한 레이아웃에서도 안정적
- ✅ Cross-platform (Web & Mobile 동일)

### 4.4 React Router와 스크롤 초기화

#### 4.4.1 자동 스크롤 리셋
```typescript
// ✅ React Router로 경로 변경 시 컴포넌트 재마운트로 자동 스크롤 리셋
<Routes>
  <Route path="/restaurant/:placeId" element={<RestaurantDetail />} />
</Routes>

// RestaurantDetail 컴포넌트가 마운트될 때마다 ScrollView가 top으로 초기화
```

---

## 5. 컴포넌트 선택 가이드

### 5.1 레이아웃 컴포넌트

| 상황 | 사용 컴포넌트 | 예시 |
|------|--------------|------|
| 페이지 전체 컨테이너 | HTML `<div>` | `<div style={{ minHeight: '100vh' }}>` |
| 섹션 컨테이너 | RN `<View>` | `<View style={{ padding: 16 }}>` |
| 스크롤 영역 | RN `<ScrollView>` | `<ScrollView style={{ flex: 1 }}>` |
| 리스트 | RN `<FlatList>` | `<FlatList data={items} />` |

### 5.2 텍스트 컴포넌트

| 상황 | 사용 컴포넌트 | 예시 |
|------|--------------|------|
| 모든 텍스트 | RN `<Text>` | `<Text>Hello</Text>` |
| 입력 필드 | RN `<TextInput>` | `<TextInput value={value} />` |

### 5.3 인터랙션 컴포넌트

| 상황 | 사용 컴포넌트 | 예시 |
|------|--------------|------|
| 버튼 | RN `<Pressable>` | `<Pressable onPress={handlePress}>` |
| 터치 영역 | RN `<TouchableOpacity>` | `<TouchableOpacity onPress={}>` |
| HTML 버튼 (Web 전용) | HTML `<button>` | `<button onClick={}>` (권장하지 않음) |

### 5.4 이미지 컴포넌트

| 상황 | 사용 컴포넌트 | 예시 |
|------|--------------|------|
| 이미지 표시 | RN `<Image>` | `<Image source={{ uri: url }} />` |

---

## 6. 핵심 원칙

### 6.1 원칙 1: React Native의 ScrollView 사용

```typescript
// ✅ GOOD
import { ScrollView } from 'react-native'

<ScrollView style={{ flex: 1 }}>
  <Content />
</ScrollView>
```

```typescript
// ❌ BAD
<div className="content-scroll">
  <Content />
</div>

useEffect(() => {
  window.scrollTo(0, 0)  // 불안정
}, [])
```

### 6.2 원칙 2: 최소한의 레이아웃 스타일

```typescript
// ✅ GOOD - 간단한 레이아웃
<View style={{ flex: 1 }}>
  <ScrollView>
    <Content />
  </ScrollView>
</View>
```

```typescript
// ❌ BAD - 복잡한 레이아웃
<div style={{
  minHeight: '100vh',
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden'
}}>
  <div style={{ flex: 1, overflow: 'auto' }}>
    <Content />
  </div>
</div>
```

### 6.3 원칙 3: CSS 기반 스크롤과 window.scrollTo() 혼용 금지

```typescript
// ❌ BAD - 혼용 금지
.content-scroll {
  overflow: auto;
}

useEffect(() => {
  window.scrollTo(0, 0)  // CSS 스크롤과 충돌
}, [])
```

```typescript
// ✅ GOOD - ScrollView만 사용
<ScrollView>
  <Content />
</ScrollView>
```

### 6.4 원칙 4: React Router 경로 변경 시 자동 리셋 활용

```typescript
// ✅ GOOD - 컴포넌트 재마운트로 자동 스크롤 리셋
<Routes>
  <Route path="/page1" element={<Page1 />} />
  <Route path="/page2" element={<Page2 />} />
</Routes>

// Page1, Page2에서 ScrollView 사용하면 자동으로 top으로 리셋
```

---

## 7. 관련 문서

### 7.1 Web Documentation
- [Web Setup](./WEB-SETUP.md) - Vite, React Native Web 설정
- [Web Layout](./WEB-LAYOUT.md) - 반응형 레이아웃 상세
- [Web Restaurant](./WEB-RESTAURANT.md) - Restaurant 컴포넌트 (패턴 적용 예시)

### 7.2 Core Documentation
- [Architecture](../00-core/ARCHITECTURE.md) - 전체 아키텍처
- [Development](../00-core/DEVELOPMENT.md) - 개발 워크플로우

### 7.3 참고 자료
- [React Native Web 공식 문서](https://necolas.github.io/react-native-web/)
- [StyleSheet API](https://reactnative.dev/docs/stylesheet)

---

**문서 버전**: 1.0
**작성일**: 2025-10-23
**관리**: Claude Code Documentation Team
