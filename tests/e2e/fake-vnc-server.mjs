import { createCipheriv, randomBytes } from 'node:crypto'
import { createServer } from 'node:net'

// A small RFB 3.8 server for E2E tests, so the VNC viewer can be tested with no VNC server installed.
// It draws one solid colour and records the keys and clicks it receives. It proves the app's side (noVNC,
// the WebSocket bridge and the SSH tunnel), not how a real server such as TigerVNC behaves.

export const FAKE_VNC_WIDTH = 320
export const FAKE_VNC_HEIGHT = 200
export const FAKE_VNC_COLOR = [18, 164, 91]

const SECURITY_NONE = 1
const SECURITY_VNC = 2

// VNC auth is DES of the challenge, keyed by the password with each byte's bits reversed. Modern OpenSSL
// has dropped single DES, but triple DES with three equal keys gives the same result.
function vncAuthResponse(password, challenge) {
  const key = Buffer.alloc(8)
  Buffer.from(password, 'latin1')
    .subarray(0, 8)
    .forEach((byte, index) => {
      let reversed = 0
      for (let bit = 0; bit < 8; bit++) if (byte & (1 << bit)) reversed |= 1 << (7 - bit)
      key[index] = reversed
    })
  const cipher = createCipheriv('des-ede3', Buffer.concat([key, key, key]), null)
  cipher.setAutoPadding(false)
  return Buffer.concat([cipher.update(challenge), cipher.final()])
}

function serverInit() {
  const name = Buffer.from('fake-vnc')
  const header = Buffer.alloc(24)
  header.writeUInt16BE(FAKE_VNC_WIDTH, 0)
  header.writeUInt16BE(FAKE_VNC_HEIGHT, 2)
  // 32 bits per pixel, depth 24, little endian, true colour, 255 per channel, shifts 16, 8, 0.
  Buffer.from([32, 24, 0, 1, 0, 255, 0, 255, 0, 255, 16, 8, 0, 0, 0, 0]).copy(header, 4)
  header.writeUInt32BE(name.length, 20)
  return Buffer.concat([header, name])
}

// Pixels are R, G, B, X: the format noVNC asks for with SetPixelFormat.
function framebufferUpdate() {
  const header = Buffer.alloc(16)
  header.writeUInt16BE(1, 2)
  header.writeUInt16BE(FAKE_VNC_WIDTH, 8)
  header.writeUInt16BE(FAKE_VNC_HEIGHT, 10)
  const pixels = Buffer.alloc(FAKE_VNC_WIDTH * FAKE_VNC_HEIGHT * 4)
  for (let offset = 0; offset < pixels.length; offset += 4) {
    Buffer.from(FAKE_VNC_COLOR).copy(pixels, offset)
  }
  return Buffer.concat([header, pixels])
}

export async function startFakeVncServer({ password = null } = {}) {
  const keysDown = []
  const clicks = []
  const authAttempts = []
  const sockets = new Set()
  let connectionCount = 0

  const server = createServer((socket) => {
    connectionCount++
    sockets.add(socket)
    socket.on('close', () => sockets.delete(socket))
    socket.on('error', () => {})

    let pending = Buffer.alloc(0)
    let stage = 'version'
    let challenge = null

    const take = (size) => {
      if (pending.length < size) return null
      const taken = pending.subarray(0, size)
      pending = pending.subarray(size)
      return taken
    }

    const finishSecurity = (ok) => {
      const result = Buffer.alloc(4)
      result.writeUInt32BE(ok ? 0 : 1)
      if (ok) {
        socket.write(result)
        stage = 'clientInit'
        return
      }
      const reason = Buffer.from('Authentication failed')
      const length = Buffer.alloc(4)
      length.writeUInt32BE(reason.length)
      socket.end(Buffer.concat([result, length, reason]))
      stage = 'closed'
    }

    // Returns true when it used some input, so the loop below can look for the next message.
    const step = () => {
      switch (stage) {
        case 'version':
          if (!take(12)) return false
          socket.write(Buffer.from([1, password === null ? SECURITY_NONE : SECURITY_VNC]))
          stage = 'securityChoice'
          return true
        case 'securityChoice':
          if (!take(1)) return false
          if (password === null) {
            finishSecurity(true)
          } else {
            challenge = randomBytes(16)
            socket.write(challenge)
            stage = 'vncAuth'
          }
          return true
        case 'vncAuth': {
          const response = take(16)
          if (!response) return false
          const ok = response.equals(vncAuthResponse(password, challenge))
          authAttempts.push(ok)
          finishSecurity(ok)
          return true
        }
        case 'clientInit':
          if (!take(1)) return false
          socket.write(serverInit())
          stage = 'messages'
          return true
        case 'messages':
          return readClientMessage()
        default:
          return false
      }
    }

    const readClientMessage = () => {
      if (pending.length === 0) return false
      const type = pending[0]
      if (type === 0) return Boolean(take(20)) // SetPixelFormat
      if (type === 2) {
        if (pending.length < 4) return false
        return Boolean(take(4 + pending.readUInt16BE(2) * 4)) // SetEncodings
      }
      if (type === 3) {
        const request = take(10) // FramebufferUpdateRequest
        if (!request) return false
        if (request[1] === 0) socket.write(framebufferUpdate())
        return true
      }
      if (type === 4) {
        const key = take(8) // KeyEvent
        if (!key) return false
        if (key[1] === 1) keysDown.push(key.readUInt32BE(4))
        return true
      }
      if (type === 5) {
        const pointer = take(6) // PointerEvent
        if (!pointer) return false
        if (pointer[1] !== 0) clicks.push({ x: pointer.readUInt16BE(2), y: pointer.readUInt16BE(4) })
        return true
      }
      if (type === 6) {
        if (pending.length < 8) return false
        return Boolean(take(8 + pending.readUInt32BE(4))) // ClientCutText
      }
      socket.destroy(new Error(`Unknown RFB client message ${type}`))
      stage = 'closed'
      return false
    }

    socket.on('data', (chunk) => {
      pending = Buffer.concat([pending, chunk])
      while (step());
    })

    socket.write('RFB 003.008\n')
  })

  await new Promise((resolvePromise, reject) => {
    server.once('error', reject)
    server.listen(0, '127.0.0.1', resolvePromise)
  })

  return {
    port: server.address().port,
    keysDown,
    clicks,
    authAttempts,
    connectionCount: () => connectionCount,
    openConnections: () => sockets.size,
    stop: () =>
      new Promise((resolvePromise) => {
        for (const socket of sockets) socket.destroy()
        server.close(() => resolvePromise())
      })
  }
}
