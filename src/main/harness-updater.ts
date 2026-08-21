import { app, BrowserWindow, dialog, ipcMain, Notification } from 'electron'
import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { UPDATE_STATE_CHANNEL, type UpdateState } from '../shared/ipc.js'
import { compareVersions, fetchLatestHarnessRelease, versionFromTag } from './harness-release.js'

const here = path.dirname(fileURLToPath(import.meta.url))
const windows = new Set<BrowserWindow>()
let handlersInstalled = false

/** Send a Harness update state change to every live desktop window. */
function publish(state: UpdateState): void {
  for (const window of windows) {
    if (!window.isDestroyed()) window.webContents.send(UPDATE_STATE_CHANNEL, state)
  }
}

/** Resolve the checkout that owns the running Harness source and artifacts. */
export function resolveHarnessCheckout(configured = process.env.DSH_DESKTOP_HARNESS_DIR): string {
  const checkout = path.resolve(configured ?? path.join(app.getAppPath(), '..', 'deepseek-harness'))
  if (!existsSync(path.join(checkout, '.git'))) {
    throw new Error(`Harness checkout not found at ${checkout}. Set DSH_DESKTOP_HARNESS_DIR to its Git checkout.`)
  }
  return checkout
}

/** Resolve the unpacked upgrade script in a packaged application or its source copy during development. */
function updaterScript(): string {
  if (app.isPackaged) return path.join(process.resourcesPath, 'app.asar.unpacked', 'scripts', 'update-harness.mjs')
  return path.join(here, '../../scripts/update-harness.mjs')
}

/** Run a command and retain its final diagnostic for the native error dialog. */
function run(command: string, args: readonly string[], options: { readonly cwd?: string; readonly env?: NodeJS.ProcessEnv } = {}): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd: options.cwd, env: options.env, stdio: ['ignore', 'pipe', 'pipe'] })
    let output = ''
    const append = (chunk: Buffer): void => { output = `${output}${chunk.toString()}`.slice(-12_000) }
    child.stdout.on('data', append)
    child.stderr.on('data', append)
    child.once('error', error => reject(new Error(`Could not start ${command}: ${error.message}`)))
    child.once('exit', code => code === 0 ? resolve(output) : reject(new Error(output || `${command} exited with code ${code ?? 'none'}`)))
  })
}

/** Read the exact release tag checked out by the local Harness repository. */
async function currentHarnessVersion(checkout: string): Promise<string> {
  const tag = (await run('git', ['-C', checkout, 'tag', '--points-at', 'HEAD'])).split('\n')
    .map(value => value.trim())
    .find(value => versionFromTag(value) !== undefined)
  if (tag === undefined) throw new Error(`Harness checkout at ${checkout} is not at a release tag`)
  return versionFromTag(tag)!
}

/** Start the checked-in update script with the Electron runtime acting as Node. */
async function updateHarness(checkout: string, tag: string): Promise<void> {
  await run(process.execPath, [updaterScript(), '--checkout', checkout, '--tag', tag], {
    env: { ...process.env, ELECTRON_RUN_AS_NODE: '1' },
  })
}

/** Check a release, present its notes, and run the user-approved checkout/build/restart sequence. */
async function checkForHarnessUpdate(window: BrowserWindow): Promise<void> {
  try {
    publish({ kind: 'checking' })
    const [release, checkout] = await Promise.all([fetchLatestHarnessRelease(), Promise.resolve(resolveHarnessCheckout())])
    const currentVersion = await currentHarnessVersion(checkout)
    if (compareVersions(release.version, currentVersion) <= 0) {
      publish({ kind: 'unavailable', currentVersion })
      return
    }
    publish({ kind: 'available', version: release.version, currentVersion, notes: release.notes })
    const response = await dialog.showMessageBox(window, {
      type: 'info',
      buttons: ['Later', 'Update Harness'],
      defaultId: 1,
      cancelId: 0,
      title: 'DeepSeek Harness update available',
      message: `DeepSeek Harness ${release.version} is available`,
      detail: `Current version: ${currentVersion}\n\nRelease notes:\n${release.notes}\n\n${release.url}`,
      noLink: true,
    })
    if (response.response !== 1) return
    publish({ kind: 'updating', version: release.version })
    await updateHarness(checkout, release.tag)
    publish({ kind: 'ready', version: release.version })
    new Notification({ title: 'DeepSeek Harness updated', body: `Version ${release.version} was built and restarted.` }).show()
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    publish({ kind: 'error', message })
    await dialog.showMessageBox(window, { type: 'error', title: 'Harness update failed', message: 'DeepSeek Harness was not updated.', detail: message })
  }
}

/** Install the privileged, user-confirmed Harness update workflow. */
export function installHarnessUpdater(mainWindow: BrowserWindow): void {
  windows.add(mainWindow)
  mainWindow.once('closed', () => windows.delete(mainWindow))
  if (handlersInstalled) return
  handlersInstalled = true
  ipcMain.handle('dsh-desktop:check-for-updates', () => checkForHarnessUpdate(mainWindow))
  if (app.isPackaged) {
    setTimeout(() => {
      try {
        resolveHarnessCheckout()
        void checkForHarnessUpdate(mainWindow)
      } catch {
        // A packaged desktop app may not have been configured with its checkout yet.
      }
    }, 3_000)
  }
}
