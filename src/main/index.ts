import { app, BrowserWindow, Menu, shell } from 'electron'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { resolveHarnessUrl } from './harness-url.js'
import { installHarnessUpdater } from './harness-updater.js'

const here = path.dirname(fileURLToPath(import.meta.url))

function rendererUrl(): string {
  const devUrl = process.env.DSH_DESKTOP_RENDERER_URL
  if (devUrl !== undefined) return devUrl
  return `file://${path.join(here, '../../renderer/index.html')}`
}

async function createWindow(): Promise<BrowserWindow> {
  const window = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 960,
    minHeight: 640,
    title: 'DeepSeek Harness',
    webPreferences: {
      preload: path.join(here, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  })
  window.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url)
    return { action: 'deny' }
  })
  installHarnessUpdater(window)
  await window.loadURL(rendererUrl())
  return window
}

async function connectHarness(window: BrowserWindow): Promise<void> {
  try {
    const url = resolveHarnessUrl(process.env.DSH_DESKTOP_URL)
    const response = await fetch(url, { signal: AbortSignal.timeout(5_000) })
    const html = await response.text()
    if (!response.ok || !html.includes('window.__DSH_BOOT__')) {
      throw new Error(`${url} is not a DeepSeek Harness Web service`)
    }
    await window.loadURL(url)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    await window.webContents.executeJavaScript(`window.showHarnessStartupError?.(${JSON.stringify(message)})`)
  }
}

app.whenReady().then(async () => {
  const window = await createWindow()
  Menu.setApplicationMenu(Menu.buildFromTemplate([
    {
      label: 'DeepSeek Harness',
      submenu: [
        { label: 'Check Harness Updates', click: () => void window.webContents.executeJavaScript('window.dshDesktop?.checkForUpdates()') },
        { type: 'separator' },
        { role: 'quit' },
      ],
    },
    { role: 'editMenu' },
    { role: 'viewMenu' },
    { role: 'windowMenu' },
  ]))
  void connectHarness(window)
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    void createWindow().then(window => {
      void connectHarness(window)
    })
  }
})
