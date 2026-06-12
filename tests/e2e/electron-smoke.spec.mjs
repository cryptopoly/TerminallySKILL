import { mkdir, readFile } from 'node:fs/promises'
import { delimiter } from 'node:path'
import { expect, test } from '@playwright/test'
import { createFakeSshFixture } from '../../scripts/create-fake-ssh-fixture.mjs'
import { launchTerminallySkill } from './electron-app.mjs'

const sshTarget = {
  type: 'ssh',
  host: 'fixture.invalid',
  user: 'deploy',
  port: 2222,
  cwd: '/srv/terminallyskill-e2e',
  identityFile: null,
  label: 'Fixture SSH',
  vncPort: null
}

async function launchWithFakeSsh(testInfo, mode) {
  const fixture = await createFakeSshFixture(testInfo.outputPath('fake-ssh-bin'))
  const sshLog = testInfo.outputPath('fake-ssh.log')

  const launched = await launchTerminallySkill(testInfo, {
    PATH: `${fixture.binDir}${delimiter}${process.env.PATH ?? ''}`,
    FAKE_SSH_MODE: mode,
    FAKE_SSH_LOG: sshLog
  })

  return { ...launched, sshLog }
}

test('launches with isolated state and persists a local project', async ({}, testInfo) => {
  const { app, page, userDataDir } = await launchTerminallySkill(testInfo)

  try {
    await expect(page).toHaveTitle('TerminallySKILL')

    const workspaceDir = testInfo.outputPath('local-workspace')
    await mkdir(workspaceDir, { recursive: true })

    const project = await page.evaluate(
      ({ cwd }) => window.electronAPI.createProject(
        'E2E Local Project',
        cwd,
        '#14b8a6',
        undefined,
        'disabled',
        true
      ),
      { cwd: workspaceDir }
    )

    expect(project.name).toBe('E2E Local Project')
    expect(project.workspaceTarget).toEqual({ type: 'local', cwd: workspaceDir })

    const projectsData = await page.evaluate(() => window.electronAPI.getAllProjects())
    expect(projectsData.activeProjectId).toBe(project.id)
    expect(projectsData.projects.map((item) => item.id)).toContain(project.id)
    expect(userDataDir).toContain('user-data')
  } finally {
    await app.close()
  }
})

test('validates an SSH workspace through the fake ssh fixture', async ({}, testInfo) => {
  const { app, page, sshLog } = await launchWithFakeSsh(testInfo, 'success')

  try {
    const result = await page.evaluate(
      (target) => window.electronAPI.testWorkspaceTarget(target),
      sshTarget
    )

    expect(result).toEqual({
      ok: true,
      message: 'SSH connection succeeded. Remote cwd: /srv/terminallyskill-e2e'
    })

    const [record] = (await readFile(sshLog, 'utf8')).trim().split('\n').map(JSON.parse)
    expect(record.mode).toBe('success')
    expect(record.args).toContain('deploy@fixture.invalid')
    expect(record.args).toContain('-p')
    expect(record.args).toContain('2222')
  } finally {
    await app.close()
  }
})

test('surfaces fake ssh authentication failures through the real IPC path', async ({}, testInfo) => {
  const { app, page } = await launchWithFakeSsh(testInfo, 'permission-denied')

  try {
    const result = await page.evaluate(
      (target) => window.electronAPI.testWorkspaceTarget(target),
      sshTarget
    )

    expect(result).toEqual({
      ok: false,
      message: 'SSH authentication failed. Check your user, key, or agent.'
    })
  } finally {
    await app.close()
  }
})
