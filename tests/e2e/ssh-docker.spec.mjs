import { mkdir, writeFile } from 'node:fs/promises'
import { delimiter, join } from 'node:path'
import { expect, test } from '@playwright/test'
import { isDockerAvailable, startDockerOpenSshFixture } from './docker-openssh-fixture.mjs'
import { launchTerminallySkill } from './electron-app.mjs'
import { createSshIsolationShim } from './local-openssh-fixture.mjs'

test('validates a real OpenSSH handshake through Docker', async ({}, testInfo) => {
  test.skip(process.env.RUN_DOCKER_E2E !== '1', 'Set RUN_DOCKER_E2E=1 to run Docker-backed SSH E2E tests.')
  const dockerAvailable = await isDockerAvailable()

  if (!dockerAvailable && process.env.REQUIRE_DOCKER_E2E === '1') {
    throw new Error('Docker is required for this CI job but is not available.')
  }

  test.skip(!dockerAvailable, 'Docker is not available.')

  const ssh = await startDockerOpenSshFixture(testInfo)
  let app

  try {
    // OpenSSH ignores $HOME (and overriding it hangs Electron on quit on macOS), so pin the
    // known_hosts file with an `ssh` wrapper on PATH instead.
    const sshHome = testInfo.outputPath('ssh-home')
    await mkdir(join(sshHome, '.ssh'), { recursive: true })
    const knownHostsFile = join(sshHome, '.ssh', 'known_hosts')
    await writeFile(knownHostsFile, ssh.knownHostsEntry, 'utf8')
    const binDir = await createSshIsolationShim({
      zshDir: join(sshHome, 'zdotdir'),
      binDir: join(sshHome, 'bin'),
      knownHostsFile,
      logFile: join(sshHome, 'ssh-calls.log')
    })

    const launched = await launchTerminallySkill(testInfo, {
      PATH: `${binDir}${delimiter}${process.env.PATH ?? ''}`
    })
    app = launched.app

    const result = await launched.page.evaluate(
      ({ target }) => window.electronAPI.testWorkspaceTarget(target),
      {
        target: {
          type: 'ssh',
          host: ssh.host,
          user: ssh.user,
          port: ssh.port,
          cwd: ssh.cwd,
          identityFile: ssh.identityFile,
          label: 'Docker OpenSSH',
          vncPort: null
        }
      }
    )

    expect(result).toEqual({
      ok: true,
      message: 'SSH connection succeeded. Remote cwd: /srv/terminallyskill-e2e'
    })
  } finally {
    if (app) await app.close()
    await ssh.stop()
  }
})
