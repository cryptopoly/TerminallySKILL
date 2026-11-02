import { execFileSync, spawn } from 'node:child_process'
import { createServer } from 'node:net'
import { join } from 'node:path'

// A real x11vnc on a private X screen, with one xterm whose typed lines go to a file. Linux only, and it
// needs Xvfb, x11vnc, xterm and xsetroot. It proves the viewer works against a real server's authentication,
// screen updates and keyboard handling.

export const REAL_VNC_WIDTH = 640
export const REAL_VNC_HEIGHT = 480
export const REAL_VNC_COLOR = [18, 164, 91]

function freePort() {
  return new Promise((resolvePromise, reject) => {
    const server = createServer()
    server.once('error', reject)
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address()
      server.close(() => resolvePromise(port))
    })
  })
}

function waitFor(check, what) {
  return new Promise((resolvePromise, reject) => {
    const started = Date.now()
    const poll = () => {
      try {
        check()
        resolvePromise()
      } catch (error) {
        if (Date.now() - started > 10000) reject(new Error(`${what}: ${error.message}`))
        else setTimeout(poll, 200)
      }
    }
    poll()
  })
}

export async function startRealVncServer(baseDir, password) {
  // X display numbers 100 to 599 stay clear of xvfb-run's own, which starts at 99.
  const display = `:${100 + Math.floor(Math.random() * 500)}`
  const env = { ...process.env, DISPLAY: display }
  const port = await freePort()
  const passwordFile = join(baseDir, 'vnc-password')
  const typedFile = join(baseDir, 'typed.txt')
  const children = []
  const stop = () => {
    for (const child of children.reverse()) child.kill('SIGTERM')
  }

  try {
    children.push(
      spawn('Xvfb', [display, '-screen', '0', `${REAL_VNC_WIDTH}x${REAL_VNC_HEIGHT}x24`, '-nolisten', 'tcp'], {
        stdio: 'ignore'
      })
    )
    const hexColor = `#${REAL_VNC_COLOR.map((value) => value.toString(16).padStart(2, '0')).join('')}`
    await waitFor(() => execFileSync('xsetroot', ['-solid', hexColor], { env, stdio: 'pipe' }), 'Xvfb did not start')

    children.push(
      spawn('xterm', ['-geometry', '40x10+0+0', '-e', 'sh', '-c', `cat > '${typedFile}'`], { env, stdio: 'ignore' })
    )

    execFileSync('x11vnc', ['-storepasswd', password, passwordFile], { stdio: 'ignore' })
    children.push(
      spawn(
        'x11vnc',
        ['-display', display, '-localhost', '-rfbport', String(port), '-rfbauth', passwordFile, '-forever', '-shared', '-quiet'],
        { env, stdio: 'ignore' }
      )
    )
    await waitFor(() => execFileSync('bash', ['-c', `exec 3<>/dev/tcp/127.0.0.1/${port}`], { stdio: 'pipe' }), 'x11vnc did not start')
  } catch (error) {
    stop()
    throw error
  }

  return { port, typedFile, stop }
}
