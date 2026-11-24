// TEMPORARY (branch fix/conpty-dll-server): opens several terminals with node-pty, then kills them back to back
// (what the app does when it quits or a window closes), many times. Reports kills that left a shell alive and
// exits that were never reported. Removed before the branch is finished.
// usage: node kill-stress.cjs <dll|inbox> <terminals> <rounds>
const { performance } = require('node:perf_hooks')
const pty = require('node-pty')

const [mode = 'dll', terminalsArg = '3', roundsArg = '50'] = process.argv.slice(2)
const useConptyDll = mode === 'dll'
const terminals = Number(terminalsArg)
const rounds = Number(roundsArg)
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

async function until(test, timeout) {
  const end = performance.now() + timeout
  while (performance.now() < end) {
    if (test()) return true
    await sleep(20)
  }
  return test()
}

function isAlive(pid) {
  try {
    process.kill(pid, 0)
    return true
  } catch {
    return false
  }
}

async function oneRound(round) {
  const open = []
  for (let index = 0; index < terminals; index++) {
    const term = pty.spawn('powershell.exe', ['-NoLogo', '-NoProfile'], {
      name: 'xterm-256color',
      cols: 80,
      rows: 24,
      cwd: process.cwd(),
      env: process.env,
      useConptyDll
    })
    const state = { term, pid: term.pid, output: '', exit: null }
    term.onData((data) => {
      state.output += data
      if (data.includes('\x1b[c')) term.write('\x1b[?1;2c')
    })
    term.onExit((event) => {
      state.exit = { exitCode: event.exitCode, at: performance.now() }
    })
    open.push(state)
  }
  const promptsSeen = await until(() => open.every((state) => /PS [^\r\n]*>/.test(state.output)), 30000)

  const killAt = performance.now()
  for (const state of open) state.term.kill()
  const killLoopMs = performance.now() - killAt
  const allExited = await until(() => open.every((state) => state.exit), 10000)

  return {
    round,
    promptsSeen,
    killLoopMs: Math.round(killLoopMs * 10) / 10,
    exitDelaysMs: open.map((state) => (state.exit ? Math.round(state.exit.at - killAt) : null)),
    exitCodes: open.map((state) => state.exit?.exitCode ?? null),
    missingExitEvents: open.filter((state) => !state.exit).length,
    shellsAliveAfterKill: allExited ? [] : open.filter((state) => !state.exit && isAlive(state.pid)).map((state) => state.pid)
  }
}

async function main() {
  console.log(`# kill-stress mode=${mode} terminals=${terminals} rounds=${rounds} pid=${process.pid}`)
  const summary = { rounds: 0, promptTimeouts: 0, missingExitEvents: 0, shellsAliveAfterKill: 0, maxKillLoopMs: 0, maxExitDelayMs: 0 }
  for (let round = 1; round <= rounds; round++) {
    const result = await oneRound(round)
    summary.rounds++
    if (!result.promptsSeen) summary.promptTimeouts++
    summary.missingExitEvents += result.missingExitEvents
    summary.shellsAliveAfterKill += result.shellsAliveAfterKill.length
    summary.maxKillLoopMs = Math.max(summary.maxKillLoopMs, result.killLoopMs)
    summary.maxExitDelayMs = Math.max(summary.maxExitDelayMs, ...result.exitDelaysMs.filter((delay) => delay !== null))
    if (!result.promptsSeen || result.missingExitEvents > 0) console.log(`ANOMALY ${JSON.stringify(result)}`)
    if (round === 1 || round % 10 === 0) console.log(`round ${round}/${rounds}: last=${JSON.stringify(result)}`)
  }
  console.log(`SUMMARY ${JSON.stringify({ mode, terminals, ...summary })}`)
  console.log('DONE')
  process.exit(0)
}

main().catch((error) => {
  console.error('kill-stress failed:', error)
  process.exit(1)
})
