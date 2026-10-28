import { spawn } from 'child_process'
import * as net from 'net'
import * as crypto from 'crypto'
import type { IncomingMessage } from 'http'
import { WebSocketServer, WebSocket } from 'ws'
import type { BrowserWindow } from 'electron'
import { IPC_CHANNELS } from '../shared/ipc-channels'
import type { SSHProjectWorkspaceTarget } from '../shared/project-schema'
import { translateNativeSync } from './native-i18n'

interface VncSession {
  sessionId: string
  windowId: number
  tunnelProcess: ReturnType<typeof spawn>
  wsServer: WebSocketServer
  localTcpPort: number
  wsPort: number
}

const vncSessions = new Map<string, VncSession>()
let nextVncId = 1

async function getFreePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = net.createServer()
    server.listen(0, '127.0.0.1', () => {
      const addr = server.address() as net.AddressInfo
      server.close(() => resolve(addr.port))
    })
    server.on('error', reject)
  })
}

async function waitForPort(port: number, maxAttempts = 25): Promise<void> {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      await new Promise<void>((resolve, reject) => {
        const s = net.connect(port, '127.0.0.1')
        s.on('connect', () => { s.destroy(); resolve() })
        s.on('error', reject)
      })
      return
    } catch {
      await new Promise((r) => setTimeout(r, 200))
    }
  }
  throw new Error(translateNativeSync('errors.sshTunnelPortNotReady', { port, attempts: maxAttempts }))
}

export async function startVncSession(
  target: SSHProjectWorkspaceTarget,
  vncPort: number,
  win: BrowserWindow
): Promise<{ sessionId: string; wsPort: number; token: string }> {
  const sessionId = `vnc-${nextVncId++}`
  const localTcpPort = await getFreePort()
  const wsPort = await getFreePort()

  // Cryptographically random token — only our renderer knows it
  const token = crypto.randomBytes(32).toString('hex')

  // Fix 1: Explicit 127.0.0.1 bind on the local side of the tunnel so it
  // can never be exposed on the network even if GatewayPorts is set.
  const sshArgs: string[] = [
    '-N',
    '-o', 'ExitOnForwardFailure=yes',
    '-o', 'ServerAliveInterval=15',
    '-o', 'StrictHostKeyChecking=accept-new',
    '-o', 'BatchMode=yes'
  ]
  if (target.port) sshArgs.push('-p', String(target.port))
  if (target.identityFile?.trim()) sshArgs.push('-i', target.identityFile.trim())
  sshArgs.push('-L', `127.0.0.1:${localTcpPort}:localhost:${vncPort}`)
  const userHost = target.user ? `${target.user}@${target.host}` : target.host
  sshArgs.push(userHost)

  const tunnelProcess = spawn('ssh', sshArgs, { stdio: ['ignore', 'ignore', 'pipe'] })

  let stderrOutput = ''
  tunnelProcess.stderr?.on('data', (chunk: Buffer) => {
    stderrOutput += chunk.toString()
    console.error(`[VNC ssh stderr] ${chunk.toString().trim()}`)
  })

  tunnelProcess.on('exit', (code) => {
    if (code !== 0 && vncSessions.has(sessionId)) {
      const detail = stderrOutput.trim() || 'SSH tunnel exited unexpectedly'
      win.webContents.send(IPC_CHANNELS.VNC_ERROR, sessionId, detail)
      stopVncSession(sessionId)
    }
  })

  try {
    await waitForPort(localTcpPort)
  } catch (err) {
    tunnelProcess.kill('SIGTERM')
    throw new Error(translateNativeSync('errors.sshTunnelFailed', { detail: err instanceof Error ? err.message : String(err) }))
  }

  const wsServer = new WebSocketServer({ host: '127.0.0.1', port: wsPort })

  // Fix 3: Reject any WebSocket connection that doesn't carry the session token
  wsServer.on('connection', (ws: WebSocket, req: IncomingMessage) => {
    const url = new URL(req.url ?? '/', 'http://127.0.0.1')
    if (url.searchParams.get('token') !== token) {
      ws.close(1008, 'Unauthorized')
      return
    }

    const tcp = net.connect(localTcpPort, '127.0.0.1')

    tcp.on('data', (chunk) => {
      if (ws.readyState === WebSocket.OPEN) ws.send(chunk)
    })

    ws.on('message', (data) => {
      tcp.write(data as Buffer)
    })

    const cleanup = (): void => {
      tcp.destroy()
      if (ws.readyState !== WebSocket.CLOSED) ws.terminate()
    }

    tcp.on('close', cleanup)
    tcp.on('error', cleanup)
    ws.on('close', cleanup)
    ws.on('error', cleanup)
  })

  vncSessions.set(sessionId, {
    sessionId,
    windowId: win.id,
    tunnelProcess,
    wsServer,
    localTcpPort,
    wsPort
  })

  return { sessionId, wsPort, token }
}

export function stopVncSession(sessionId: string): void {
  const session = vncSessions.get(sessionId)
  if (!session) return
  session.wsServer.close()
  session.tunnelProcess.kill('SIGTERM')
  vncSessions.delete(sessionId)
}

export function stopVncSessionsForWindow(win: BrowserWindow): void {
  for (const [id, session] of vncSessions.entries()) {
    if (session.windowId === win.id) {
      session.wsServer.close()
      session.tunnelProcess.kill('SIGTERM')
      vncSessions.delete(id)
    }
  }
}

export function stopAllVncSessions(): void {
  for (const id of vncSessions.keys()) stopVncSession(id)
}
