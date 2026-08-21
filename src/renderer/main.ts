import type { UpdateState } from '../shared/ipc.js'
import './style.css'

const status = document.querySelector<HTMLParagraphElement>('#status')!
const error = document.querySelector<HTMLElement>('#error')!
const checkUpdate = document.querySelector<HTMLButtonElement>('#check-update')!

function renderUpdate(state: UpdateState): void {
  if (state.kind === 'checking') status.textContent = 'Checking GitHub Releases for an update…'
  if (state.kind === 'available') status.textContent = `Harness ${state.version} is available (current: ${state.currentVersion}). Review the update prompt to install it.`
  if (state.kind === 'updating') status.textContent = `Updating Harness to ${state.version}…`
  if (state.kind === 'ready') status.textContent = `Harness ${state.version} was built and restarted.`
  if (state.kind === 'unavailable') status.textContent = `Harness ${state.currentVersion} is up to date.`
  if (state.kind === 'error') status.textContent = `Update check failed: ${state.message}`
}

window.showHarnessStartupError = (message: string): void => {
  status.textContent = 'DeepSeek Harness could not be reached.'
  error.hidden = false
  error.textContent = `${message}\n\nStart dsh web first, or set DSH_DESKTOP_URL to its HTTP address.`
}

checkUpdate.addEventListener('click', () => void window.dshDesktop?.checkForUpdates())
window.dshDesktop?.onUpdateState(renderUpdate)
