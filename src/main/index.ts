import { app, BrowserWindow, Menu, shell } from 'electron'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { startHarnessRuntime, type HarnessRuntime } from './runtime.js'
import { installUpdater } from './updater.js'

const here = path.dirname(fileURLToPath(import.meta.url))
let runtime: HarnessRuntime | undefined

/** Prefer the sibling source checkout while developing; releases use installed dsh. */
function harnessCommand(): { command: string; args?: readonly string[] } {
  const configured = process.env.DSH_DESKTOP_COMMAND
  if (configured !== undefined && configured !== '') return { command: configured }
  const siblingCheckout = path.resolve(app.getAppPath(), '../deepseek-harness')
  if (!app.isPackaged && existsSync(path.join(siblingCheckout, 'package.json'))) {
    return { command: 'pnpm', args: ['--dir', siblingCheckout, 'dsh'] }
  }
  return { command: 'dsh' }
}

function rendererUrl(): string {
  const devUrl = process.env.DSH_DESKTOP_RENDERER_URL
  if (devUrl !== undefined) return devUrl
  return `file://${path.join(here, '../../renderer/index.html')}`
}

function createWindow(): BrowserWindow {
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
  installUpdater(window)
  void window.loadURL(rendererUrl())
  return window
}

async function bootHarness(window: BrowserWindow): Promise<void> {
  try {
    runtime = await startHarnessRuntime(harnessCommand())
    await window.loadURL(runtime.url)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    await window.webContents.executeJavaScript(`window.showHarnessStartupError?.(${JSON.stringify(message)})`)
  }
}

app.whenReady().then(() => {
  const window = createWindow()
  Menu.setApplicationMenu(Menu.buildFromTemplate([
    {
      label: 'DeepSeek Harness',
      submenu: [
        { label: 'Check for Updates', click: () => void window.webContents.executeJavaScript('window.dshDesktop?.checkForUpdates()') },
        { label: 'Download Update', click: () => void window.webContents.executeJavaScript('window.dshDesktop?.downloadUpdate()') },
        { label: 'Install Downloaded Update', click: () => void window.webContents.executeJavaScript('window.dshDesktop?.installUpdate()') },
        { type: 'separator' },
        { role: 'quit' },
      ],
    },
    { role: 'editMenu' },
    { role: 'viewMenu' },
    { role: 'windowMenu' },
  ]))
  void bootHarness(window)
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
app.on('before-quit', () => runtime?.stop())
app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    const window = createWindow()
    if (runtime === undefined) void bootHarness(window)
    else void window.loadURL(runtime.url)
  }
})
