import { chmod, mkdir, writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { tmpdir } from 'node:os'
import { mkdtempSync } from 'node:fs'
import { pathToFileURL } from 'node:url'

const sshScript = `#!/usr/bin/env node
const { appendFileSync } = require('node:fs')

const args = process.argv.slice(2)
const mode = process.env.FAKE_SSH_MODE || 'success'
const remotePwd = process.env.FAKE_SSH_PWD || '/srv/terminallyskill-e2e'
const logPath = process.env.FAKE_SSH_LOG || ''

if (logPath) {
  appendFileSync(logPath, JSON.stringify({ args, mode, at: new Date().toISOString() }) + '\\n')
}

if (mode === 'permission-denied') {
  console.error('Permission denied (publickey).')
  process.exit(255)
}

if (mode === 'host-key-failed') {
  console.error('Host key verification failed.')
  process.exit(255)
}

if (mode === 'resolve-failed') {
  console.error('Could not resolve hostname fixture.invalid: nodename nor servname provided')
  process.exit(255)
}

if (mode === 'timeout') {
  setInterval(() => {}, 1000)
  return
}

if (args.includes('-N')) {
  process.on('SIGTERM', () => process.exit(0))
  process.on('SIGINT', () => process.exit(0))
  setInterval(() => {}, 1000)
  return
}

console.log(remotePwd)
process.exit(0)
`

const cmdScript = `@echo off
node "%~dp0\\ssh" %*
`

export async function createFakeSshFixture(targetDir = mkdtempSync(join(tmpdir(), 'terminallyskill-fake-ssh-'))) {
  const resolvedTargetDir = resolve(targetDir)
  await mkdir(resolvedTargetDir, { recursive: true })
  await writeFile(join(resolvedTargetDir, 'ssh'), sshScript, 'utf8')
  await chmod(join(resolvedTargetDir, 'ssh'), 0o755)
  await writeFile(join(resolvedTargetDir, 'ssh.cmd'), cmdScript, 'utf8')

  return {
    binDir: resolvedTargetDir,
    pathValue: `${resolvedTargetDir}${process.platform === 'win32' ? ';' : ':'}$PATH`
  }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const fixture = await createFakeSshFixture(process.argv[2])
  console.log(`FAKE_SSH_BIN_DIR=${fixture.binDir}`)
  console.log(`PATH=${fixture.pathValue}`)
  console.log('Modes: success, permission-denied, host-key-failed, resolve-failed, timeout')
}
