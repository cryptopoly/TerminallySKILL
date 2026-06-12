import { execFile } from 'node:child_process'
import { readFile, rm } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const fixtureDir = resolve(rootDir, 'tests/e2e/fixtures/openssh')
const imageName = 'terminallyskill-e2e-openssh:latest'

function execFileAsync(command, args, options = {}) {
  return new Promise((resolvePromise, reject) => {
    execFile(command, args, options, (error, stdout, stderr) => {
      if (error) {
        error.stdout = stdout
        error.stderr = stderr
        reject(error)
        return
      }

      resolvePromise({ stdout, stderr })
    })
  })
}

async function retry(action, attempts = 20) {
  let lastError

  for (let index = 0; index < attempts; index += 1) {
    try {
      return await action()
    } catch (error) {
      lastError = error
      await new Promise((resolvePromise) => setTimeout(resolvePromise, 250))
    }
  }

  throw lastError
}

export async function isDockerAvailable() {
  try {
    await execFileAsync('docker', ['info'], { timeout: 10000 })
    return true
  } catch {
    return false
  }
}

export async function startDockerOpenSshFixture(testInfo) {
  const keyPath = testInfo.outputPath('ssh-e2e-key')
  const containerName = `terminallyskill-e2e-ssh-${testInfo.workerIndex}-${Date.now()}`

  await rm(keyPath, { force: true })
  await rm(`${keyPath}.pub`, { force: true })
  await execFileAsync('ssh-keygen', ['-t', 'ed25519', '-N', '', '-f', keyPath], { timeout: 10000 })

  const publicKey = (await readFile(`${keyPath}.pub`, 'utf8')).trim()

  await execFileAsync('docker', ['build', '-t', imageName, fixtureDir], {
    cwd: rootDir,
    timeout: 120000
  })

  await execFileAsync(
    'docker',
    [
      'run',
      '-d',
      '--rm',
      '--name',
      containerName,
      '-e',
      `AUTHORIZED_KEYS=${publicKey}`,
      '-p',
      '127.0.0.1::2222',
      imageName
    ],
    { timeout: 30000 }
  )

  const { stdout: portOutput } = await execFileAsync(
    'docker',
    ['port', containerName, '2222/tcp'],
    { timeout: 10000 }
  )
  const port = Number(portOutput.trim().split(':').at(-1))

  if (!Number.isInteger(port) || port <= 0) {
    throw new Error(`Could not determine OpenSSH fixture port from docker output: ${portOutput}`)
  }

  const sshArgs = [
    '-i',
    keyPath,
    '-p',
    String(port),
    '-o',
    'BatchMode=yes',
    '-o',
    'StrictHostKeyChecking=no',
    '-o',
    'UserKnownHostsFile=/dev/null',
    'e2e@127.0.0.1',
    'pwd'
  ]

  await retry(async () => {
    const { stdout } = await execFileAsync('ssh', sshArgs, { timeout: 5000 })
    if (!stdout.trim()) throw new Error('OpenSSH fixture did not return pwd output')
  })

  const { stdout: knownHostsEntry } = await execFileAsync(
    'ssh-keyscan',
    ['-p', String(port), '127.0.0.1'],
    { timeout: 10000 }
  )

  return {
    host: '127.0.0.1',
    user: 'e2e',
    port,
    cwd: '/srv/terminallyskill-e2e',
    identityFile: keyPath,
    knownHostsEntry,
    async stop() {
      await execFileAsync('docker', ['rm', '-f', containerName], { timeout: 30000 }).catch(() => {})
    }
  }
}
