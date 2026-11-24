// TEMPORARY (branch fix/conpty-dll-server): runs kill-stress.cjs as a child process, so a crash or a hang of
// node-pty is reported (exit code, last output, thread and process state) instead of ending the job silently.
// Removed before the branch is finished.
// usage: node supervise.cjs <dll|inbox> <terminals> <rounds>
const { execFileSync, spawn } = require('node:child_process')
const path = require('node:path')

const QUIET_LIMIT_MS = 120000
const EXIT_LIMIT_MS = 30000
const child = spawn(process.execPath, [path.join(__dirname, 'kill-stress.cjs'), ...process.argv.slice(2)], {
  stdio: ['ignore', 'pipe', 'pipe']
})

// node-pty's inbox kill path forks a helper that often fails with "AttachConsole failed" once the console is
// gone, and prints a stack for it. Count those instead of printing them.
const HELPER_NOISE = /AttachConsole failed|conpty_console_list_agent|getConsoleProcessList|^\s+at |^\s*\^|^Node\.js v/
let helperNoiseLines = 0
let done = false
let timer = null
function arm(limit, reason) {
  clearTimeout(timer)
  timer = setTimeout(() => {
    console.log(`HANG: ${reason}`)
    try {
      const script = path.join(__dirname, 'diagnose.ps1')
      const report = execFileSync('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', script, '-TargetPid', String(child.pid)], {
        encoding: 'utf8',
        timeout: 240000
      })
      console.log(report)
    } catch (error) {
      console.log(`diagnose failed: ${error.message}`)
    }
    child.kill()
    process.exitCode = 2
  }, limit)
}

function onOutput(prefix) {
  return (buffer) => {
    for (const line of buffer.toString().split(/\r?\n/)) {
      if (!line.trim()) continue
      if (prefix && HELPER_NOISE.test(line)) {
        helperNoiseLines++
        continue
      }
      console.log(`${prefix}${line}`)
      if (line === 'DONE') done = true
    }
    arm(done ? EXIT_LIMIT_MS : QUIET_LIMIT_MS, done ? `no exit ${EXIT_LIMIT_MS}ms after DONE` : `no output for ${QUIET_LIMIT_MS}ms`)
  }
}

child.stdout.on('data', onOutput(''))
child.stderr.on('data', onOutput('[stderr] '))
arm(QUIET_LIMIT_MS, `no output for ${QUIET_LIMIT_MS}ms`)
child.on('exit', (code, signal) => {
  clearTimeout(timer)
  const hex = typeof code === 'number' ? `0x${(code >>> 0).toString(16).toUpperCase()}` : 'n/a'
  console.log(`CHILD EXIT code=${code} (${hex}) signal=${signal} reachedDone=${done} helperNoiseLines=${helperNoiseLines}`)
  if (code !== 0 || !done) process.exitCode = process.exitCode || 1
})
