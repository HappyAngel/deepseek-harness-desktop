import type { DesktopApi } from '../shared/ipc.js'

declare global {
  interface Window {
    dshDesktop?: DesktopApi
    showHarnessStartupError?: (message: string) => void
  }
}

export {}
