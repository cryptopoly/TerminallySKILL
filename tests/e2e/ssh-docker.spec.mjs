import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { expect, test } from '@playwright/test'
import { isDockerAvailable, startDockerOpenSshFixture } from './docker-openssh-fixture.mjs'
import { launchTerminallySkill } from './electron-app.mjs'

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
    const sshHome = testInfo.outputPath('ssh-home')
    await mkdir(join(sshHome, '.ssh'), { recursive: true })
    await writeFile(join(sshHome, '.ssh', 'known_hosts'), ssh.knownHostsEntry, 'utf8')

    const launched = await launchTerminallySkill(testInfo, {
      HOME: sshHome,
      USERPROFILE: sshHome
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
