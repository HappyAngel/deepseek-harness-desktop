# DeepSeek Harness Desktop

The independent Electron desktop client for [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness). It connects to an already-running Harness Web service and displays its existing UI in a native window, so conversations, workspace tools, settings, plugins, and all feature UI stay exactly aligned with the Harness release instead of being reimplemented in a second frontend.

## Prerequisites

- Node.js 22 or newer and pnpm 10 or newer.
- A running Harness Web service. By default, the desktop client connects to `http://127.0.0.1:3080`, the standard `dsh web` address.

For a service on another address, set `DSH_DESKTOP_URL`, for example `DSH_DESKTOP_URL=http://127.0.0.1:3081 pnpm dev`.

## Development

```sh
pnpm install
pnpm dev
```

The loading view stays local to Electron while it verifies the Harness service, then the window switches to the web UI. Closing the desktop app does not stop the service.

## Build and package

```sh
pnpm build
pnpm typecheck
pnpm test
pnpm dist
```

`pnpm dist` writes platform installers to `release/`. A packaged app keeps Node integration off and exposes only a narrow, context-isolated update bridge to its local loading page; Harness itself remains responsible for its UI and API security.

## GitHub Releases and updates

The `electron-builder` configuration publishes installers and update metadata to the `HappyAngel/deepseek-harness-desktop` GitHub repository. Packaged apps check GitHub Releases after launch. The application menu provides the manual check; when an update is found it reports progress through native notifications, downloads only after the user chooses **Download Update** in the menu, and installs on quit.

The [release workflow](.github/workflows/release.yml) publishes a release when a `v*` tag is pushed. It needs the repository's standard `GITHUB_TOKEN` write permission. This project does not target the App Store. For personal macOS use, GitHub Releases can distribute an unsigned build after a local Gatekeeper override; trusted in-app macOS update installation still needs a Developer ID signature and notarization. Configure the signing secrets in the workflow only when you need that fully automatic macOS path.

## Project layout

- `src/main/` owns the native window, managed Harness process, and updater.
- `src/preload/` exposes a minimal update-only IPC API.
- `src/renderer/` is the small local loading/error page shown before the Harness UI is ready.
- `src/shared/` owns IPC types shared by main, preload, and renderer.
