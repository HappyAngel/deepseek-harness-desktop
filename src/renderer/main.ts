import type { UpdateState } from '../shared/ipc.js'
import './style.css'

const status = document.querySelector<HTMLParagraphElement>('#status')!
const error = document.querySelector<HTMLElement>('#error')!
const checkUpdate = document.querySelector<HTMLButtonElement>('#check-update')!

function renderUpdate(state: UpdateState): void {
  if (state.kind === 'checking') status.textContent = 'Checking GitHub Releases for an update…'
  if (state.kind === 'available') status.textContent = `Version ${state.version} is available. Choose Download in the app menu.`
  if (state.kind === 'downloading') status.textContent = `Downloading update: ${Math.round(state.progress)}%`
  if (state.kind === 'ready') status.textContent = `Version ${state.version} will install when you quit the app.`
  if (state.kind === 'unavailable') status.textContent = 'You are already up to date.'
  if (state.kind === 'error') status.textContent = `Update check failed: ${state.message}`
}

window.showHarnessStartupError = (message: string): void => {
  status.textContent = 'DeepSeek Harness could not be reached.'
  error.hidden = false
  error.textContent = `${message}\n\nStart dsh web first, or set DSH_DESKTOP_URL to its HTTP address.`
}

checkUpdate.addEventListener('click', () => void window.dshDesktop?.checkForUpdates())
window.dshDesktop?.onUpdateState(renderUpdate)
