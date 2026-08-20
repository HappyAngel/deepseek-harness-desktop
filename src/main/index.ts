import { app, BrowserWindow, Menu, shell } from 'electron'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { startHarnessRuntime, type HarnessRuntime } from './runtime.js'
import { installUpdater } from './updater.js'

const here = path.dirname(fileURLToPath(import.meta.url))
let runtime: HarnessRuntime | undefined

/** Prefer the sibling source checkout while developing; releases use installed dsh. */
function pnpmCommand(): string | undefined {
  const pathEntries = (process.env.PATH ?? '').split(path.delimiter)
  const candidates = [
    ...pathEntries.map(entry => path.join(entry, 'pnpm')),
    '/opt/homebrew/bin/pnpm',
    '/usr/local/bin/pnpm',
  ]
  return candidates.find(candidate => existsSync(candidate))
}

function sourceHarnessCommand(directory: string): { command: string; args: readonly string[] } | undefined {
  const pnpm = pnpmCommand()
  if (pnpm === undefined || !existsSync(path.join(directory, 'package.json'))) return undefined
  return {
    // `pnpm dsh` uses the source launcher's resolver, which is required for
    // workspace plugin imports in the current Harness development checkout.
    command: pnpm,
    args: ['--dir', directory, 'dsh'],
  }
}

function harnessCommand(): { command: string; args?: readonly string[]; env?: NodeJS.ProcessEnv } {
  const configured = process.env.DSH_DESKTOP_COMMAND
  if (configured !== undefined && configured !== '') return { command: configured }
  const sourceCandidates = [
    path.resolve(app.getAppPath(), '../deepseek-harness'),
    // A local directory package lives at release/<arch>/<app>.app/Contents.
    path.resolve(path.dirname(process.execPath), '../../../../../../deepseek-harness'),
  ]
  for (const directory of sourceCandidates) {
    const sourceCommand = sourceHarnessCommand(directory)
    if (sourceCommand !== undefined) return sourceCommand
  }
  return { command: 'dsh' }
}

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
  installUpdater(window)
  await window.loadURL(rendererUrl())
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

app.whenReady().then(async () => {
  const window = await createWindow()
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
    void createWindow().then(window => {
      if (runtime === undefined) void bootHarness(window)
      else void window.loadURL(runtime.url)
    })
  }
})
