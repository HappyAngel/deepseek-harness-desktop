/** A state message emitted while the desktop application checks for releases. */
export type UpdateState =
  | { kind: 'idle' }
  | { kind: 'checking' }
  | { kind: 'available'; version: string }
  | { kind: 'downloading'; progress: number }
  | { kind: 'ready'; version: string }
  | { kind: 'unavailable' }
  | { kind: 'error'; message: string }

/** IPC event carrying update status from the trusted main process. */
export const UPDATE_STATE_CHANNEL = 'dsh-desktop:update-state'

/** The deliberately small bridge exposed to the local loading view. */
export interface DesktopApi {
  checkForUpdates(): Promise<void>
  downloadUpdate(): Promise<void>
  installUpdate(): Promise<void>
  onUpdateState(listener: (state: UpdateState) => void): () => void
}

declare global {
  interface Window {
    dshDesktop?: DesktopApi
  }
}

export {}
