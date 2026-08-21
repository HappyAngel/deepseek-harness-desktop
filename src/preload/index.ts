import { contextBridge, ipcRenderer } from 'electron'
import { UPDATE_STATE_CHANNEL, type DesktopApi, type UpdateState } from '../shared/ipc.js'

const api: DesktopApi = {
  checkForUpdates: () => ipcRenderer.invoke('dsh-desktop:check-for-updates') as Promise<void>,
  onUpdateState(listener) {
    const callback = (_event: Electron.IpcRendererEvent, state: UpdateState): void => listener(state)
    ipcRenderer.on(UPDATE_STATE_CHANNEL, callback)
    return () => ipcRenderer.removeListener(UPDATE_STATE_CHANNEL, callback)
  },
}

contextBridge.exposeInMainWorld('dshDesktop', api)
