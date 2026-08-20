import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process'

const READY_URL = /dsh web: (http:\/\/127\.0\.0\.1:\d+)\b/u
const START_TIMEOUT_MS = 30_000

/** A locally managed Harness web process. */
export interface HarnessRuntime {
  readonly url: string
  stop(): void
}

/** Executable and optional fixed arguments required to invoke the Harness CLI. */
export interface HarnessCommand {
  command: string
  args?: readonly string[]
}

/** Extract the harness-owned ready URL from accumulated process output. */
export function readReadyUrl(output: string): string | undefined {
  return READY_URL.exec(output)?.[1]
}

/** Start `dsh web` and resolve only when its own ready URL is printed. */
export function startHarnessRuntime({ command, args = [] }: HarnessCommand): Promise<HarnessRuntime> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, [...args, 'web', '--no-open', '--port', '0'], {
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true,
    })
    let settled = false
    let output = ''
    const settle = (callback: () => void): void => {
      if (settled) return
      settled = true
      clearTimeout(timeout)
      callback()
    }
    const stop = (): void => {
      if (!child.killed) child.kill()
    }
    const onData = (chunk: Buffer): void => {
      output = `${output}${chunk.toString()}`.slice(-8_000)
      const url = readReadyUrl(output)
      if (url === undefined) return
      settle(() => resolve({ url, stop }))
    }
    const timeout = setTimeout(() => {
      settle(() => {
        stop()
        reject(new Error(`DeepSeek Harness did not become ready within ${START_TIMEOUT_MS / 1_000} seconds.\n${output}`))
      })
    }, START_TIMEOUT_MS)

    child.stdout.on('data', onData)
    child.stderr.on('data', onData)
    child.once('error', error => settle(() => reject(new Error(`Could not start \"${command}\": ${error.message}`))))
    child.once('exit', (code, signal) => {
      if (!settled) settle(() => reject(new Error(`DeepSeek Harness stopped before it was ready (code ${code ?? 'none'}, signal ${signal ?? 'none'}).\n${output}`)))
    })
  })
}

/** Visible only to unit tests; it gives the child process an explicit type seam. */
export function stopChildProcess(child: Pick<ChildProcessWithoutNullStreams, 'killed' | 'kill'>): void {
  if (!child.killed) child.kill()
}
