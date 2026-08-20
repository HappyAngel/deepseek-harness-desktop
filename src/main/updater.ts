import { app, BrowserWindow, ipcMain, Notification } from 'electron'
import updaterPackage from 'electron-updater'
import { UPDATE_STATE_CHANNEL, type UpdateState } from '../shared/ipc.js'

const { autoUpdater } = updaterPackage

const windows = new Set<BrowserWindow>()
let handlersInstalled = false

/** Send an updater state change to every live desktop window. */
function publish(state: UpdateState): void {
  for (const window of windows) {
    if (!window.isDestroyed()) window.webContents.send(UPDATE_STATE_CHANNEL, state)
  }
}

/** Wire GitHub Release updates to the desktop shell without exposing Node to the UI. */
export function installUpdater(mainWindow: BrowserWindow): void {
  windows.add(mainWindow)
  mainWindow.once('closed', () => windows.delete(mainWindow))
  if (handlersInstalled) return
  handlersInstalled = true
  autoUpdater.autoDownload = false
  autoUpdater.autoInstallOnAppQuit = true
  autoUpdater.on('checking-for-update', () => publish({ kind: 'checking' }))
  autoUpdater.on('update-available', info => {
    publish({ kind: 'available', version: info.version })
    new Notification({ title: 'DeepSeek Harness update available', body: `Version ${info.version} is ready to download from the app menu.` }).show()
  })
  autoUpdater.on('update-not-available', () => publish({ kind: 'unavailable' }))
  autoUpdater.on('download-progress', progress => publish({ kind: 'downloading', progress: progress.percent }))
  autoUpdater.on('update-downloaded', info => {
    publish({ kind: 'ready', version: info.version })
    new Notification({ title: 'DeepSeek Harness update ready', body: `Version ${info.version} will install when the application closes.` }).show()
  })
  autoUpdater.on('error', error => publish({ kind: 'error', message: error.message }))

  ipcMain.handle('dsh-desktop:check-for-updates', async () => {
    if (!app.isPackaged) {
      publish({ kind: 'unavailable' })
      return
    }
    await autoUpdater.checkForUpdates()
  })
  ipcMain.handle('dsh-desktop:download-update', () => autoUpdater.downloadUpdate())
  ipcMain.handle('dsh-desktop:install-update', () => autoUpdater.quitAndInstall())
  if (app.isPackaged) setTimeout(() => void autoUpdater.checkForUpdates(), 3_000)
}
