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

```bash
# Run all tests
npm test

# Run tests in watch mode
npm test -- --watch
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
