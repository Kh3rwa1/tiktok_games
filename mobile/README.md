# TikTok Games Mobile App

A React Native + Expo mobile application for TikTok Games.

## Quick Start

### Prerequisites

- Node.js 18+ installed
- Expo Go app on your phone (for QR code preview)
- VS Code with recommended extensions

### Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure environment:**
   ```bash
   # Edit .env file with your API URL
   # For local development, use your computer's IP address
   EXPO_PUBLIC_API_URL=http://192.168.1.100:5000
   ```

3. **Start development server:**
   ```bash
   npm start
   ```

4. **Preview on device:**
   - Scan the QR code with Expo Go (Android) or Camera app (iOS)
   - Or press `i` for iOS Simulator / `a` for Android Emulator

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm start` | Start Expo dev server with QR code |
| `npm run start:clear` | Start with cache cleared |
| `npm run android` | Start on Android emulator |
| `npm run ios` | Start on iOS simulator |
| `npm run web` | Start in web browser |
| `npm run tunnel` | Start with tunnel (external access) |
| `npm run lint` | Run ESLint |
| `npm run type-check` | Run TypeScript type checking |

## VS Code Setup

This project includes VS Code configuration for optimal development:

1. Open the `mobile` folder in VS Code
2. Install recommended extensions when prompted
3. Format on save is enabled automatically

### Recommended Extensions

- Prettier - Code formatter
- ESLint
- ES7+ React/Redux/React-Native snippets
- React Native Tools
- Path Intellisense

## Project Structure

```
mobile/
├── src/
│   ├── components/     # Reusable UI components
│   ├── screens/        # Screen components
│   │   ├── auth/       # Login, Register screens
│   │   └── ...         # Home, Profile, etc.
│   ├── navigation/     # Navigation configuration
│   ├── services/       # API client
│   ├── store/          # Zustand state management
│   └── types/          # TypeScript type definitions
├── assets/             # Images, fonts
├── App.tsx             # App entry point
├── app.json            # Expo configuration
└── package.json        # Dependencies
```

## Development Workflow

### Preview on Physical Device

1. Install Expo Go on your phone:
   - [Android](https://play.google.com/store/apps/details?id=host.exp.exponent)
   - [iOS](https://apps.apple.com/app/expo-go/id982107779)

2. Run `npm start` in terminal

3. Scan QR code:
   - **Android:** Use Expo Go app to scan
   - **iOS:** Use Camera app to scan

### Preview on Emulator/Simulator

```bash
# iOS Simulator (macOS only)
npm run ios

# Android Emulator
npm run android
```

### Tunnel Mode (External Access)

Use tunnel mode when your phone and computer are on different networks:

```bash
npm run tunnel
```

## Building for Production

### Using EAS Build (Recommended)

1. Install EAS CLI:
   ```bash
   npm install -g eas-cli
   ```

2. Login to Expo:
   ```bash
   eas login
   ```

3. Configure project:
   ```bash
   eas build:configure
   ```

4. Build:
   ```bash
   # Preview build (internal testing)
   npm run build:preview

   # Production build
   npm run build:android
   npm run build:ios
   ```

## Environment Configuration

Create a `.env` file in the mobile directory:

```env
# API URL - use your local IP for development
EXPO_PUBLIC_API_URL=http://192.168.1.100:5000
```

To find your local IP:
- **macOS/Linux:** `ifconfig | grep "inet "`
- **Windows:** `ipconfig`

## Troubleshooting

### QR Code not scanning

- Ensure phone and computer are on same WiFi network
- Try `npm run tunnel` for external access

### Metro bundler issues

```bash
npm run start:clear
```

### Dependency issues

```bash
rm -rf node_modules
npm install
```

### TypeScript errors

```bash
npm run type-check
```

## Tech Stack

- **Framework:** React Native 0.76+ with Expo SDK 52
- **Language:** TypeScript
- **Navigation:** React Navigation 6
- **State:** Zustand
- **API:** Axios
- **UI:** React Native + Expo components

## License

Private - All rights reserved
