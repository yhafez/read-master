# Read Master Desktop

Desktop application for Read Master built with [Tauri](https://tauri.app/).

## Why Tauri?

Tauri offers significant advantages over Electron:

- **Smaller binaries**: ~10MB vs ~150MB for Electron
- **Lower memory usage**: Uses system webview instead of bundled Chromium
- **Better security**: Rust backend with strong memory safety guarantees
- **Native performance**: Rust for performance-critical operations

## Prerequisites

1. **Rust**: Install from [rustup.rs](https://rustup.rs/)
2. **Node.js**: v20 or later
3. **Platform-specific dependencies**:
   - **macOS**: Xcode Command Line Tools (`xcode-select --install`)
   - **Windows**: Visual Studio Build Tools with C++ workload
   - **Linux**: `webkit2gtk` and `libappindicator` (see [Tauri docs](https://tauri.app/v1/guides/getting-started/prerequisites))

## Development

```bash
# Install dependencies
pnpm install

# Start development mode (runs web app + Tauri)
pnpm dev

# Build for production
pnpm build
```

## Project Structure

```
apps/desktop/
├── package.json          # Node.js dependencies and scripts
├── tsconfig.json         # TypeScript configuration
├── src/                  # TypeScript source (Tauri API bridge)
│   ├── index.ts          # Main export
│   └── tauri-api.ts      # Tauri commands wrapper
└── src-tauri/            # Rust/Tauri source
    ├── Cargo.toml        # Rust dependencies
    ├── tauri.conf.json   # Tauri configuration
    ├── icons/            # App icons
    └── src/
        ├── main.rs       # Entry point
        ├── commands.rs   # IPC commands
        ├── menu.rs       # Application menu
        └── tray.rs       # System tray
```

## Building for Distribution

```bash
# Build for current platform
pnpm build

# Debug build (includes DevTools)
pnpm build:debug
```

Builds are output to `src-tauri/target/release/bundle/`.

## Features

- **Native menu bar** with keyboard shortcuts
- **System tray** with quick actions
- **Auto-updates** via GitHub releases
- **File system access** for importing books
- **Notifications** for reminders
- **Persistent storage** for settings
- **Window state persistence** (size, position)

## Tauri API Usage

The `tauri-api.ts` module provides a unified API that works in both web and desktop:

```typescript
import { desktopApi } from "@read-master/desktop";

// Check if running in Tauri
if (desktopApi.isTauri()) {
  // Open file dialog
  const result = await desktopApi.file.openDialog({
    title: "Select Book",
    multiple: false,
  });

  if (!result.canceled) {
    const contents = await desktopApi.file.read(result.paths[0]);
    // Process file...
  }
}

// Works in both web and desktop
await desktopApi.notification.show("Hello", "World");
```

## Configuration

Edit `src-tauri/tauri.conf.json` to configure:

- App metadata (name, version, identifier)
- Window settings (size, title bar style)
- Security (CSP, allowed domains)
- Bundle settings (icons, category)
- Update endpoints

## License

MIT
