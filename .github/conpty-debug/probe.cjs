// TEMPORARY (branch fix/conpty-dll-server): probes node-pty's bundled conpty.dll directly, without Electron.
// Removed before the branch is finished.
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const { performance } = require('node:perf_hooks')

const ptyRoot = path.dirname(require.resolve('node-pty/package.json'))
const rel = (p) => path.relative(ptyRoot, p).replace(/\\/g, '/')
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

function list(dir, depth = 0, out = []) {
  if (!fs.existsSync(dir)) {
    out.push(`  ${rel(dir)}: MISSING`)
    return out
  }
  for (const name of fs.readdirSync(dir).sort()) {
    const full = path.join(dir, name)
    const stat = fs.statSync(full)
    if (stat.isDirectory()) {
      if (depth < 2 && name !== 'obj') list(full, depth + 1, out)
    } else if (/\.(node|dll|exe)$|forge-meta/.test(name)) {
      out.push(`  ${rel(full)}  ${stat.size} bytes  ${stat.mtime.toISOString()}`)
    }
  }
  return out
}

async function trial(pty, label, useConptyDll) {
  let maxLag = 0
  let last = performance.now()
  const lagTimer = setInterval(() => {
    const now = performance.now()
    maxLag = Math.max(maxLag, now - last - 10)
    last = now
  }, 10)
  const t0 = performance.now()
  const ms = () => Math.round(performance.now() - t0)
  const result = { label, useConptyDll }
  try {
    let term
    try {
      term = pty.spawn('powershell.exe', ['-NoLogo', '-NoProfile'], {
        name: 'xterm-256color',
        cols: 80,
        rows: 24,
        cwd: process.cwd(),
        env: process.env,
        useConptyDll
      })
    } catch (error) {
      result.spawnThrew = error.message
      return result
    }
    result.spawnCallMs = ms()
    let output = ''
    term.onData((data) => {
      result.firstDataMs ??= ms()
      output += data
      if (data.includes('\x1b[c')) {
        result.da1QueryMs ??= ms()
        term.write('\x1b[?1;2c')
      }
    })
    const exited = new Promise((resolve) => term.onExit((event) => resolve({ ...event, atMs: ms() })))
    const until = async (test, timeout) => {
      const end = performance.now() + timeout
      while (performance.now() < end) {
        if (test()) return true
        await sleep(25)
      }
      return false
    }
    result.promptSeen = await until(() => /PS [^\r\n]*>/.test(output), 20000)
    result.promptMs = ms()
    term.write('echo probe-$(6*7)\r')
    result.echoSeen = await until(() => output.includes('probe-42'), 10000)
    result.echoMs = ms()
    result.maxLoopLagBeforeKillMs = Math.round(maxLag)
    maxLag = 0
    last = performance.now()
    const killAt = performance.now()
    term.kill()
    result.killCallMs = Math.round(performance.now() - killAt)
    const exit = await Promise.race([exited, sleep(15000).then(() => null)])
    result.exit = exit
      ? { exitCode: exit.exitCode, msAfterKill: Math.round(exit.atMs - (killAt - t0)) }
      : 'NO EXIT EVENT IN 15s'
    result.maxLoopLagAfterKillMs = Math.round(maxLag)
    if (!result.promptSeen || !result.echoSeen) result.outputTail = JSON.stringify(output.slice(-300))
    return result
  } finally {
    clearInterval(lagTimer)
  }
}

async function main() {
  console.log(`# ${os.version()} (${os.release()}) ${process.arch}, node ${process.version}, ${os.cpus().length} cpus`)
  console.log('## native files in node_modules/node-pty')
  for (const dir of ['build', `prebuilds/win32-${process.arch}`]) console.log(list(path.join(ptyRoot, dir)).join('\n'))

  const native = require(path.join(ptyRoot, 'lib/utils.js')).loadNativeModule('conpty')
  const nativeDir = path.resolve(ptyRoot, 'lib', native.dir)
  console.log(`## node-pty loads conpty.node from: ${rel(nativeDir)}`)
  for (const file of ['conpty/conpty.dll', 'conpty/OpenConsole.exe']) {
    console.log(`  ${file} next to it: ${fs.existsSync(path.join(nativeDir, file)) ? 'present' : 'MISSING'}`)
  }

  const pty = require('node-pty')
  console.log('## spawn, write, kill, spawn again (timings in ms, on the main thread)')
  const trials = [
    ['dll-1', true],
    ['dll-2', true],
    ['dll-3', true],
    ['inbox-1', false],
    ['dll-4-after-inbox', true]
  ]
  for (const [label, dll] of trials) console.log(JSON.stringify(await trial(pty, label, dll)))

  console.log('## two DLL terminals at once')
  console.log(JSON.stringify(await Promise.all([trial(pty, 'dll-pair-a', true), trial(pty, 'dll-pair-b', true)])))
  process.exit(0)
}

main().catch((error) => {
  console.error('probe failed:', error)
  process.exit(1)
})
