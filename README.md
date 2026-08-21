# DeepSeek Harness Desktop

The independent Electron desktop client for [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness). It connects to an already-running Harness Web service and displays its existing UI in a native window, so conversations, workspace tools, settings, plugins, and all feature UI stay exactly aligned with the Harness release instead of being reimplemented in a second frontend.

## Prerequisites

- Node.js 22 or newer and pnpm 10 or newer.
- A running Harness Web service. By default, the desktop client connects to `http://127.0.0.1:3080`, the standard `dsh web` address.

For a service on another address, set `DSH_DESKTOP_URL`, for example `DSH_DESKTOP_URL=http://127.0.0.1:3081 pnpm dev`.

For Harness updates, desktop needs the source Git checkout that backs the running service. During development it uses the sibling `../deepseek-harness` checkout. Set `DSH_DESKTOP_HARNESS_DIR` to use another location. The `ds` executable must be on `PATH`; the update flow finishes with `ds restart`.

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

## Harness updates

The application menu's **Check Harness Updates** command reads the [DeepSeek Harness GitHub Releases](https://github.com/deepseek-ai/deepseek-harness/releases) API, including prereleases. It compares the newest release with the exact Git tag checked out in `DSH_DESKTOP_HARNESS_DIR`, shows the release notes, and asks for confirmation.

On confirmation, desktop runs its bundled `scripts/update-harness.mjs`: it refuses a checkout with tracked changes, fetches the release tag, checks it out detached, runs `pnpm install --frozen-lockfile` and `pnpm run build`, then executes `ds restart`. The script can also be used directly:

```sh
node scripts/update-harness.mjs --checkout /path/to/deepseek-harness --tag dsh-v0.1.0-rc.8
```

The `electron-builder` configuration still publishes desktop installers to the `HappyAngel/deepseek-harness-desktop` GitHub repository. The [release workflow](.github/workflows/release.yml) publishes a release when a `v*` tag is pushed. It needs the repository's standard `GITHUB_TOKEN` write permission. This project does not target the App Store. For personal macOS use, GitHub Releases can distribute an unsigned build after a local Gatekeeper override; trusted in-app macOS update installation still needs a Developer ID signature and notarization. Configure the signing secrets in the workflow only when you need that fully automatic macOS path.

## Project layout

- `src/main/` owns the native window, Harness service connection, and updater.
- `src/preload/` exposes a minimal update-only IPC API.
- `src/renderer/` is the small local loading/error page shown before the Harness UI is ready.
- `src/shared/` owns IPC types shared by main, preload, and renderer.
