# DeepSeek Harness Desktop

The independent Electron desktop client for [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness). It starts a local Harness Web runtime and displays its existing UI in a native window, so conversations, workspace tools, settings, plugins, and all feature UI stay exactly aligned with the Harness release instead of being reimplemented in a second frontend.

## Prerequisites

- Node.js 22 or newer and pnpm 10 or newer.
- A working `dsh` command on `PATH` for packaged releases. Install or build DeepSeek Harness first; the desktop app starts it with `dsh web --no-open --port 0` and waits for its loopback ready URL. During development it automatically uses a sibling `../deepseek-harness` checkout through `pnpm dsh`.

For a development checkout where the command has another name, set `DSH_DESKTOP_COMMAND` to that executable before starting the application.

## Development

```sh
pnpm install
pnpm dev
```

The loading view stays local to Electron until Harness is ready, then the window switches to the loopback web UI. Closing the desktop app stops only the `dsh web` child it started.

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
