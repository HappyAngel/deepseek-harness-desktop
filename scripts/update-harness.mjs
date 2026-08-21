#!/usr/bin/env node
import { spawn } from 'node:child_process'
import path from 'node:path'

const RELEASE_TAG = /^dsh-v\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/u

/** Run a process while inheriting its output, rejecting when it cannot complete successfully. */
function run(command, args, cwd) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd, stdio: 'inherit' })
    child.once('error', error => reject(new Error(`Could not start ${command}: ${error.message}`)))
    child.once('exit', code => code === 0 ? resolve() : reject(new Error(`${command} exited with code ${code ?? 'none'}`)))
  })
}

/** Read a command's text output without granting it control of the current terminal. */
function output(command, args, cwd) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd, stdio: ['ignore', 'pipe', 'pipe'] })
    let stdout = ''
    let stderr = ''
    child.stdout.on('data', chunk => { stdout += chunk })
    child.stderr.on('data', chunk => { stderr += chunk })
    child.once('error', error => reject(new Error(`Could not start ${command}: ${error.message}`)))
    child.once('exit', code => code === 0 ? resolve(stdout) : reject(new Error(stderr || `${command} exited with code ${code ?? 'none'}`)))
  })
}

/** Read the two explicitly named arguments required for a repeatable Harness update. */
function options(argv) {
  const values = new Map()
  for (let index = 0; index < argv.length; index += 2) {
    const name = argv[index]
    const value = argv[index + 1]
    if ((name !== '--checkout' && name !== '--tag') || value === undefined || values.has(name)) throw new Error('Usage: update-harness.mjs --checkout <path> --tag <dsh-vX.Y.Z>')
    values.set(name, value)
  }
  const checkout = values.get('--checkout')
  const tag = values.get('--tag')
  if (typeof checkout !== 'string' || typeof tag !== 'string' || !RELEASE_TAG.test(tag)) {
    throw new Error('Usage: update-harness.mjs --checkout <path> --tag <dsh-vX.Y.Z>')
  }
  return { checkout: path.resolve(checkout), tag }
}

async function main() {
  const { checkout, tag } = options(process.argv.slice(2))
  const repository = await output('git', ['-C', checkout, 'rev-parse', '--is-inside-work-tree'], checkout)
  if (repository.trim() !== 'true') throw new Error(`${checkout} is not a Git checkout`)
  const changes = await output('git', ['-C', checkout, 'status', '--porcelain', '--untracked-files=no'], checkout)
  if (changes.trim() !== '') throw new Error('Refusing to update a Harness checkout with tracked local changes')
  await run('git', ['-C', checkout, 'fetch', '--tags', 'origin', tag], checkout)
  await run('git', ['-C', checkout, 'rev-parse', '--verify', `${tag}^{commit}`], checkout)
  await run('git', ['-C', checkout, 'checkout', '--detach', tag], checkout)
  await run('pnpm', ['install', '--frozen-lockfile'], checkout)
  await run('pnpm', ['run', 'build'], checkout)
  await run('ds', ['restart'], checkout)
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
})
