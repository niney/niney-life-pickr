# Niney Life Pickr Mobile App

React Native mobile application for life decision-making.

## Setup

```bash
cd apps/mobile
npm install
```

## Development

### Android
```bash
npm run android
```

### iOS (macOS only)
```bash
cd ios && pod install
npm run ios
```

## Testing

### Unit Testing (Jest)

```bash
# Run all unit tests
npm test

# Run tests in watch mode
npm test -- --watch
```

### E2E Testing (Maestro)

#### Install Maestro CLI

```bash
# Install Maestro CLI (one-time setup)
curl -Ls "https://get.maestro.mobile.dev" | bash
export PATH="$PATH":"$HOME/.maestro/bin"
```

#### Run E2E Tests

**Prerequisites:**
- Android emulator or device must be running
- For Android: `adb devices` should show at least one device
- For iOS: Simulator must be open

```bash
# Start Android emulator first (if not already running)
# Option 1: From Android Studio AVD Manager
# Option 2: Command line (replace 'Pixel_5_API_33' with your emulator name)
emulator -avd Pixel_5_API_33

# Then run E2E tests
npm run test:e2e          # Run all E2E tests
npm run test:e2e:smoke    # Run smoke test only
npm run test:e2e:studio   # Open Maestro Studio for visual test creation
npm run test:e2e:record   # Record new test flows
npm run test:e2e:cloud    # Run tests on Maestro Cloud (requires account)
```

#### Test Flows

- `smoke-test.yaml`: Basic app functionality check
- `app-launch.yaml`: App launch and initial screen verification
- `counter-test.yaml`: Counter increment functionality
- `navigation-test.yaml`: Menu navigation testing

#### Writing New Tests

Create new test files in `tests/e2e/flows/` directory. Example:

```yaml
appId: com.nineylifepickrmobile
---
- launchApp
- assertVisible: "Text to verify"
- tapOn: "Button text"
- takeScreenshot: "screenshots/test-name"
```

## Build

### Android
```bash
cd android
./gradlew assembleRelease
```

### iOS (macOS only)
```bash
cd ios
xcodebuild -workspace NineyLifePickrMobile.xcworkspace -scheme NineyLifePickrMobile -configuration Release
```

## Project Structure

```
apps/mobile/
├── src/
│   ├── screens/        # Screen components
│   ├── components/     # Reusable UI components
│   ├── navigation/     # Navigation configuration
│   ├── services/       # API services
│   ├── utils/          # Utility functions
│   └── types/          # TypeScript definitions
├── __tests__/          # Test files
├── android/            # Android native code
└── ios/                # iOS native code
```

## Technologies

- React Native 0.81.1
- TypeScript 5.8.3
- React Navigation v7
- React Native Elements
- Testing Library
