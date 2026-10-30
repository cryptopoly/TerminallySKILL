import { execFile, spawn } from 'node:child_process'
import { chmod, mkdir, readFile, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { createServer, connect } from 'node:net'
import { userInfo } from 'node:os'
import { join } from 'node:path'

// A throwaway, user-space OpenSSH server for E2E tests. It runs as the current
// (non-root) user on a random 127.0.0.1 port and keeps every file (host key,
// client key, authorized_keys, config, pid file, logs) inside `baseDir`. It never
// reads or writes ~/.ssh or any system sshd configuration.

const SSHD_PATH = process.env.LOCAL_SSHD_PATH || '/usr/sbin/sshd'

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

function findFreePort() {
  return new Promise((resolvePromise, reject) => {
    const server = createServer()
    server.once('error', reject)
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address()
      server.close(() => resolvePromise(port))
    })
  })
}

function canConnect(port) {
  return new Promise((resolvePromise) => {
    const socket = connect({ host: '127.0.0.1', port })
    socket.once('connect', () => {
      socket.destroy()
      resolvePromise(true)
    })
    socket.once('error', () => resolvePromise(false))
  })
}

export function isLocalSshdAvailable() {
  return process.platform !== 'win32' && existsSync(SSHD_PATH)
}

/**
 * Starts a user-space sshd. Throws if it cannot start (callers should turn that
 * into a test skip with the message).
 *
 * @param baseDir directory (e.g. testInfo.outputPath('local-sshd')) that owns all files.
 */
export async function startLocalOpenSshFixture(baseDir) {
  if (!isLocalSshdAvailable()) {
    throw new Error(`${SSHD_PATH} is not available on this machine.`)
  }

  const user = userInfo().username
  await mkdir(baseDir, { recursive: true })
  await chmod(baseDir, 0o700)

  const clientKey = join(baseDir, 'client_key')
  const wrongKey = join(baseDir, 'wrong_key')
  const hostKey = join(baseDir, 'host_key')
  const authorizedKeys = join(baseDir, 'authorized_keys')
  const pidFile = join(baseDir, 'sshd.pid')
  const configPath = join(baseDir, 'sshd_config')
  const logPath = join(baseDir, 'sshd.log')
  const cwd = join(baseDir, 'remote-cwd')

  await mkdir(cwd, { recursive: true })

  for (const key of [clientKey, wrongKey, hostKey]) {
    await execFileAsync('ssh-keygen', ['-q', '-t', 'ed25519', '-N', '', '-f', key], {
      timeout: 15000
    })
  }

  await writeFile(authorizedKeys, await readFile(`${clientKey}.pub`, 'utf8'), 'utf8')
  await chmod(authorizedKeys, 0o600)

  const port = await findFreePort()

  await writeFile(
    configPath,
    [
      `Port ${port}`,
      'ListenAddress 127.0.0.1',
      `HostKey ${hostKey}`,
      `AuthorizedKeysFile ${authorizedKeys}`,
      `PidFile ${pidFile}`,
      'PasswordAuthentication no',
      'KbdInteractiveAuthentication no',
      'PubkeyAuthentication yes',
      'UsePAM no',
      'StrictModes no',
      'AuthenticationMethods publickey',
      `AllowUsers ${user}`,
      'LogLevel ERROR',
      'PermitUserEnvironment no',
      ''
    ].join('\n'),
    'utf8'
  )

  // Validate the config before starting so failures are explicit.
  await execFileAsync(SSHD_PATH, ['-t', '-f', configPath], { timeout: 10000 })

  const child = spawn(SSHD_PATH, ['-D', '-e', '-f', configPath], {
    stdio: ['ignore', 'ignore', 'pipe']
  })
  let stderr = ''
  let exited = false
  child.stderr.on('data', (chunk) => {
    stderr += chunk.toString()
  })
  child.once('exit', () => {
    exited = true
  })

  const stop = async () => {
    if (exited) return
    // Only ever signal the child we spawned (its PID), never by name.
    const exitPromise = new Promise((resolvePromise) => child.once('exit', resolvePromise))
    child.kill('SIGTERM')
    const timer = setTimeout(() => {
      if (!exited) child.kill('SIGKILL')
    }, 3000)
    await exitPromise
    clearTimeout(timer)
  }

  try {
    const deadline = Date.now() + 10000
    while (!(await canConnect(port))) {
      if (exited) throw new Error(`sshd exited during startup: ${stderr.trim()}`)
      if (Date.now() > deadline) throw new Error(`sshd did not accept connections: ${stderr.trim()}`)
      await new Promise((resolvePromise) => setTimeout(resolvePromise, 100))
    }

    // Prove public-key login works before the tests rely on it. All state is
    // pinned to the temp dir (-F /dev/null skips ~/.ssh/config; known hosts are /dev/null).
    const { stdout } = await execFileAsync(
      'ssh',
      [
        '-F', '/dev/null',
        '-i', clientKey,
        '-p', String(port),
        '-o', 'IdentitiesOnly=yes',
        '-o', 'IdentityAgent=none',
        '-o', 'BatchMode=yes',
        '-o', 'StrictHostKeyChecking=no',
        '-o', 'UserKnownHostsFile=/dev/null',
        '-o', 'GlobalKnownHostsFile=/dev/null',
        `${user}@127.0.0.1`,
        'echo ready'
      ],
      { timeout: 15000 }
    )
    if (!stdout.includes('ready')) throw new Error('sshd login probe returned no output')

    const { stdout: knownHostsEntry } = await execFileAsync(
      'ssh-keyscan',
      ['-p', String(port), '-t', 'ed25519', '127.0.0.1'],
      { timeout: 10000 }
    )

    return {
      host: '127.0.0.1',
      port,
      user,
      cwd,
      identityFile: clientKey,
      wrongIdentityFile: wrongKey,
      knownHostsEntry,
      baseDir,
      stop
    }
  } catch (error) {
    await stop()
    throw new Error(`${error instanceof Error ? error.message : String(error)}\n${stderr}`.trim())
  }
}

/**
 * Writes an `ssh` wrapper into `binDir` and makes the app's shells find it first.
 *
 * Why: OpenSSH resolves "~" from the passwd database, not $HOME, so overriding HOME
 * does not redirect ~/.ssh/known_hosts on macOS. Without a wrapper the app's plain
 * `ssh` calls would consult (and, in an interactive session, possibly write) the
 * developer's real ~/.ssh/known_hosts. The wrapper pins the config and known_hosts
 * to test-owned files and disables the agent, then execs the real /usr/bin/ssh with
 * the exact arguments the app built, and logs those arguments (one line per call)
 * to `logFile`. The app's own ssh argument construction is therefore still what is
 * under test.
 *
 * The app derives its terminal PATH from a login+interactive shell probe (macOS
 * path_helper puts /usr/bin first), so a PATH prefix on the Electron process is not
 * enough. We also write zsh rc files into `zshDir` (handed to the app as ZDOTDIR, so the
 * real home is untouched) that prepend `binDir` to PATH. HOME is deliberately NOT
 * overridden: on macOS an Electron launched with a different HOME did not exit on
 * quit (observed >40s hang), and OpenSSH ignores $HOME anyway.
 *
 * Returns the PATH prefix for the Electron process.
 */
export async function createSshIsolationShim({ zshDir, binDir, knownHostsFile, logFile }) {
  await mkdir(binDir, { recursive: true })
  const shimPath = join(binDir, 'ssh')
  const script = `#!/bin/sh
printf '%s\\n' "$*" >> '${logFile}'
exec /usr/bin/ssh -F /dev/null \\
  -o UserKnownHostsFile='${knownHostsFile}' \\
  -o GlobalKnownHostsFile=/dev/null \\
  -o IdentityAgent=none \\
  -o IdentitiesOnly=yes \\
  -o ServerAliveInterval=30 \\
  "$@"
`
  await writeFile(shimPath, script, 'utf8')
  await chmod(shimPath, 0o755)

  // zsh reads its rc files from ZDOTDIR, so the developer's real ~/.zshrc is never read.
  await mkdir(zshDir, { recursive: true })
  const rc = `export PATH='${binDir}':"$PATH"\nexport HISTFILE=/dev/null\n`
  for (const name of ['.zshrc', '.zprofile']) {
    await writeFile(join(zshDir, name), rc, 'utf8')
  }
  return binDir
}
