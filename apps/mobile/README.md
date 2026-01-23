# Read Master Mobile

Mobile application for Read Master built with [React Native](https://reactnative.dev/) and [Expo](https://expo.dev/).

## Features

- **Library Management**: Browse, search, and manage your book collection
- **Reader Interface**: Read EPUB and PDF books with customizable settings
- **Flashcards (SRS)**: Review vocabulary and concepts with spaced repetition
- **Social Features**: View activity feed, leaderboards, and reading clubs
- **Offline Support**: Download books for offline reading
- **Biometric Authentication**: Secure app with Face ID/Touch ID
- **Push Notifications**: Reminders for reviews and streak maintenance
- **Multi-language Support**: English, Arabic, Spanish, Japanese, Chinese, Tagalog

## Prerequisites

1. **Node.js**: v20 or later
2. **Expo CLI**: `npm install -g expo-cli`
3. **iOS Development** (macOS only):
   - Xcode 15+
   - iOS Simulator
4. **Android Development**:
   - Android Studio
   - Android SDK
   - Android Emulator or physical device

## Development

```bash
# Install dependencies
pnpm install

# Start development server
pnpm start

# Start on iOS Simulator (macOS only)
pnpm ios

# Start on Android Emulator
pnpm android
```

## Project Structure

```
apps/mobile/
├── package.json              # Dependencies and scripts
├── tsconfig.json             # TypeScript configuration
├── app.json                  # Expo configuration
├── babel.config.js           # Babel configuration
├── src/
│   ├── App.tsx               # Main app entry
│   ├── navigation/           # Navigation setup
│   │   ├── RootNavigator.tsx # Root navigation
│   │   ├── MainTabs.tsx      # Bottom tabs
│   │   ├── AuthStack.tsx     # Auth flow
│   │   └── ReaderStack.tsx   # Reader navigation
│   ├── screens/              # Screen components
│   │   ├── Auth/             # Authentication screens
│   │   ├── Library/          # Library screens
│   │   ├── Reader/           # Reader screens
│   │   ├── Flashcards/       # SRS screens
│   │   ├── Social/           # Social screens
│   │   └── Settings/         # Settings screens
│   ├── components/           # Reusable components
│   │   └── common/           # Common components
│   ├── hooks/                # Custom React hooks
│   ├── stores/               # Zustand state stores
│   ├── services/             # API client
│   ├── theme/                # Theme provider
│   └── utils/                # Utility functions
└── ios/                      # iOS native code
└── android/                  # Android native code
```

## Environment Variables

Create a `.env` file with:

```env
EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
EXPO_PUBLIC_API_URL=http://localhost:3001/api
```

## Building for Production

### EAS Build (Recommended)

```bash
# Configure EAS
eas build:configure

# Build for iOS
eas build --platform ios

# Build for Android
eas build --platform android

# Build for both platforms
eas build --platform all
```

### Local Build

```bash
# iOS (requires Xcode)
expo run:ios --configuration Release

# Android
expo run:android --variant release
```

## Features Implementation

### Reader Features

- Tap zones: Left (previous), Center (toggle controls), Right (next)
- Progress tracking with auto-save
- Bookmarks and annotations
- Text search within book
- Customizable font, size, spacing, and margins
- Multiple theme support (light, dark, sepia)

### Offline Support

- Download books for offline reading
- Sync progress when back online
- Offline flashcard reviews

### Biometric Authentication

- Face ID (iOS)
- Touch ID (iOS)
- Fingerprint (Android)
- Fallback to app PIN

## Testing

```bash
# Run tests
pnpm test

# Run tests with coverage
pnpm test --coverage
```

## License

MIT
