/** A state message emitted while the desktop application checks Harness releases. */
export type UpdateState =
  | { kind: 'idle' }
  | { kind: 'checking' }
  | { kind: 'available'; version: string; currentVersion: string; notes: string }
  | { kind: 'updating'; version: string }
  | { kind: 'ready'; version: string }
  | { kind: 'unavailable'; currentVersion: string }
  | { kind: 'error'; message: string }

/** IPC event carrying update status from the trusted main process. */
export const UPDATE_STATE_CHANNEL = 'dsh-desktop:update-state'

/** The deliberately small bridge exposed to the local loading view. */
export interface DesktopApi {
  checkForUpdates(): Promise<void>
  onUpdateState(listener: (state: UpdateState) => void): () => void
}

declare global {
  interface Window {
    dshDesktop?: DesktopApi
  }
}

export {}
