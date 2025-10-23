# MOBILE-SETUP.md

> **Last Updated**: 2025-10-23 21:55
> **Purpose**: React Native mobile app setup, Metro bundler, and configuration

---

## Table of Contents

1. [Overview](#1-overview)
2. [Metro Bundler Configuration](#2-metro-bundler-configuration)
3. [TypeScript Configuration](#3-typescript-configuration)
4. [Dependencies](#4-dependencies)
5. [Development Scripts](#5-development-scripts)
6. [Platform-Specific Setup](#6-platform-specific-setup)
7. [Common Issues](#7-common-issues)
8. [Related Documentation](#8-related-documentation)

---

## 1. Overview

The mobile application is built with **React Native 0.82** and uses **Metro bundler** for JavaScript bundling. It shares components and logic with the web app via the `shared` module.

### Key Technologies
- **React Native**: 0.82.0
- **React**: 19.1.1
- **TypeScript**: 5.8.3
- **Metro Bundler**: @react-native/metro-config 0.81.4
- **Navigation**: React Navigation 7.x
- **Testing**: Maestro (E2E)

### Architecture
```
apps/mobile/
├── android/              # Android platform code
├── ios/                  # iOS platform code
├── src/
│   ├── screens/         # Screen components
│   ├── navigation/      # Navigation configuration
│   ├── components/      # Mobile-specific components
│   └── App.tsx          # Root component
├── .maestro/            # Maestro E2E tests
├── metro.config.js      # Metro bundler config
├── tsconfig.json        # TypeScript config
└── package.json         # Dependencies and scripts
```

---

## 2. Metro Bundler Configuration

### 2.1 File Location

**Location**: `apps/mobile/metro.config.js`

### 2.2 Configuration

```javascript
const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');
const path = require('path');

const defaultConfig = getDefaultConfig(__dirname);

let defaultBlockList = []
if (defaultConfig && defaultConfig.resolver && defaultConfig.resolver.blockList) {
  defaultBlockList = defaultConfig.resolver.blockList;
}

const blockList = [
  // Exclude shared/node_modules directory
  /shared[/\\]node_modules[/\\].*/,
];

const config = {
  watchFolders: [
    // Add shared folder to watch list
    path.resolve(__dirname, '../shared'),
  ],
  resolver: {
    extraNodeModules: {
      'shared': path.resolve(__dirname, '../shared'),
    },
    blockList: [
      ...defaultBlockList,
      ...blockList
    ],
    nodeModulesPaths: [
      path.resolve(__dirname, 'node_modules'),
    ],
  },
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
```

### 2.3 Key Settings Explained

#### Watch Folders
```javascript
watchFolders: [
  path.resolve(__dirname, '../shared'),
],
```

**Purpose**: Monitor shared module for changes and trigger hot reload

#### Extra Node Modules
```javascript
extraNodeModules: {
  'shared': path.resolve(__dirname, '../shared'),
}
```

**Effect**: Allows importing from `shared` module
```typescript
import { Button, InputField } from 'shared/components'
```

#### Block List
```javascript
blockList: [
  /shared[/\\]node_modules[/\\].*/,
]
```

**Purpose**: Prevent Metro from processing `shared/node_modules` (avoids conflicts)

#### Node Modules Paths
```javascript
nodeModulesPaths: [
  path.resolve(__dirname, 'node_modules'),
]
```

**Purpose**: Use mobile app's own node_modules for dependencies

---

## 3. TypeScript Configuration

### 3.1 File Location

**Location**: `apps/mobile/tsconfig.json`

### 3.2 Configuration

```json
{
  "extends": "@react-native/typescript-config",
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "shared": ["../shared"],
      "shared/*": ["../shared/*"]
    }
  },
  "include": ["**/*.ts", "**/*.tsx"],
  "exclude": ["**/node_modules", "**/Pods"]
}
```

### 3.3 Key Settings

#### Extends
```json
"extends": "@react-native/typescript-config"
```

**Includes**:
- `"jsx": "react-native"`
- `"module": "commonjs"`
- React Native-specific compiler options

#### Path Mapping
```json
"paths": {
  "shared": ["../shared"],
  "shared/*": ["../shared/*"]
}
```

**Usage**:
```typescript
import { useAuth } from 'shared/hooks'
import { Button } from 'shared/components'
```

#### Exclude
```json
"exclude": ["**/node_modules", "**/Pods"]
```

**Purpose**: Exclude external dependencies and iOS Pods from TypeScript compilation

---

## 4. Dependencies

### 4.1 File Location

**Location**: `apps/mobile/package.json`

### 4.2 Key Dependencies

```json
{
  "dependencies": {
    "react": "19.1.1",
    "react-native": "0.82.0",
    "@react-navigation/native": "^7.1.18",
    "@react-navigation/native-stack": "^7.3.27",
    "@react-navigation/bottom-tabs": "^7.4.8",
    "@react-native-async-storage/async-storage": "^2.2.0",
    "socket.io-client": "^4.8.1",
    "@fortawesome/react-native-fontawesome": "^0.3.2"
  }
}
```

#### Core Libraries
- **react-native**: 0.82.0 (React Native framework)
- **react**: 19.1.1 (same version as web)

#### Navigation
- **@react-navigation/native**: Navigation framework
- **@react-navigation/native-stack**: Stack navigator
- **@react-navigation/bottom-tabs**: Tab navigator

#### Storage & Network
- **@react-native-async-storage/async-storage**: Persistent storage
- **socket.io-client**: Real-time communication

#### UI Libraries
- **@fortawesome/react-native-fontawesome**: Icon library
- **react-native-safe-area-context**: Safe area insets
- **react-native-screens**: Native screen handling

### 4.3 Dev Dependencies

```json
{
  "devDependencies": {
    "typescript": "^5.8.3",
    "@babel/core": "^7.25.2",
    "@react-native/metro-config": "0.81.4",
    "@react-native/typescript-config": "0.81.4",
    "@react-native-community/cli": "20.0.0"
  }
}
```

---

## 5. Development Scripts

### 5.1 Available Scripts

**Location**: `apps/mobile/package.json`

```json
{
  "scripts": {
    "start": "react-native start",
    "android": "react-native run-android",
    "ios": "react-native run-ios",
    "lint": "eslint .",
    "test": "jest",
    "test:e2e": "maestro test .maestro",
    "test:e2e:smoke": "maestro test .maestro/smoke.yaml",
    "test:e2e:login": "maestro test .maestro/login.yaml",
    "test:e2e:studio": "maestro studio"
  }
}
```

### 5.2 Script Descriptions

#### Start Metro Bundler
```bash
cd apps/mobile
npm start
```

**Output**: Metro bundler starts on port 8081

#### Run on Android
```bash
npm run android
```

**Steps**:
1. Builds Android app
2. Installs APK on emulator/device
3. Opens app

**Requirements**:
- Android Studio installed
- Android SDK configured
- Emulator running or device connected

#### Run on iOS
```bash
npm run ios
```

**Steps**:
1. Installs CocoaPods dependencies
2. Builds iOS app in Xcode
3. Opens app in simulator

**Requirements**:
- macOS only
- Xcode installed
- CocoaPods installed

#### Lint
```bash
npm run lint
```

**Runs**: ESLint on all source files

#### E2E Testing (Maestro)
```bash
npm run test:e2e          # Run all tests
npm run test:e2e:login    # Run login test only
npm run test:e2e:studio   # Open Maestro Studio
```

**See**: `MOBILE-TESTING.md` for details

---

## 6. Platform-Specific Setup

### 6.1 Android Setup

#### Requirements
- Android Studio (latest)
- Android SDK (API 34+)
- Java 17+

#### Environment Variables
```bash
export ANDROID_HOME=$HOME/Library/Android/sdk
export PATH=$PATH:$ANDROID_HOME/emulator
export PATH=$PATH:$ANDROID_HOME/platform-tools
```

#### Build Configuration
**Location**: `android/app/build.gradle`

```gradle
android {
    compileSdkVersion 34
    defaultConfig {
        applicationId "com.niney.lifepickr"
        minSdkVersion 21
        targetSdkVersion 34
        versionCode 1
        versionName "1.0"
    }
}
```

### 6.2 iOS Setup

#### Requirements
- macOS (Big Sur or later)
- Xcode (15+)
- CocoaPods (1.11+)

#### Install CocoaPods Dependencies
```bash
cd apps/mobile/ios
pod install
```

#### Build Configuration
**Location**: `ios/mobile/Info.plist`

```xml
<key>CFBundleIdentifier</key>
<string>com.niney.lifepickr</string>
<key>CFBundleVersion</key>
<string>1</string>
```

---

## 7. Common Issues

### 7.1 Metro Bundler Port Conflict

**Problem**: Port 8081 already in use

**Solution**:
```bash
# Kill process on port 8081
lsof -ti:8081 | xargs kill -9

# Or use different port
npm start -- --port 8082
```

### 7.2 Shared Module Not Found

**Problem**: `Cannot find module 'shared/components'`

**Cause**: Metro not watching shared folder or cache issue

**Solution**:
```bash
# Reset Metro cache
npm start -- --reset-cache

# Verify metro.config.js has watchFolders
```

### 7.3 Android Build Failed

**Problem**: Gradle build fails

**Solution**:
```bash
# Clean Android build
cd android
./gradlew clean

# Rebuild
cd ..
npm run android
```

### 7.4 iOS Pod Install Failed

**Problem**: CocoaPods dependencies fail to install

**Solution**:
```bash
# Update CocoaPods
sudo gem install cocoapods

# Clean and reinstall
cd ios
rm -rf Pods Podfile.lock
pod install
```

### 7.5 React Native Version Mismatch

**Problem**: Version conflicts between mobile and shared

**Solution**:
- Ensure same React version in `mobile/package.json` and `shared/package.json`
- Clear node_modules and reinstall

```bash
cd apps/mobile
rm -rf node_modules
npm install
```

---

## 8. Related Documentation

### Mobile Documentation
- **[MOBILE-NAVIGATION.md](./MOBILE-NAVIGATION.md)**: React Navigation setup
- **[MOBILE-HOME.md](./MOBILE-HOME.md)**: Home screen
- **[MOBILE-LOGIN.md](./MOBILE-LOGIN.md)**: Login screen
- **[MOBILE-TESTING.md](./MOBILE-TESTING.md)**: Maestro E2E tests

### Shared Documentation
- **[SHARED-OVERVIEW.md](../03-shared/SHARED-OVERVIEW.md)**: Shared module structure
- **[SHARED-COMPONENTS.md](../03-shared/SHARED-COMPONENTS.md)**: Cross-platform components

### Web Documentation
- **[WEB-SETUP.md](../01-web/WEB-SETUP.md)**: Web setup comparison

### Core Documentation
- **[ARCHITECTURE.md](../00-core/ARCHITECTURE.md)**: Overall architecture
- **[DEVELOPMENT.md](../00-core/DEVELOPMENT.md)**: Development workflow

---

**Document Version**: 1.0.0
**Covers Files**: `metro.config.js`, `tsconfig.json`, `package.json`, platform setup
