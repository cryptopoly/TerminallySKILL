import { mkdir } from 'node:fs/promises'
import { expect, test } from '@playwright/test'
import { launchTerminallySkill } from './electron-app.mjs'

async function seedScheduledScript(page, testInfo, { withApproval }) {
  const workspaceDir = testInfo.outputPath('workspace')
  await mkdir(workspaceDir, { recursive: true })

  const { project, script } = await page.evaluate(
    async ({ cwd, withApproval }) => {
      const project = await window.electronAPI.createProject(
        'E2E Scheduled Project',
        cwd,
        '#14b8a6',
        undefined,
        'disabled',
        true
      )
      const created = await window.electronAPI.createScript('E2E Scheduled', project.id, 'e2e')
      let script = await window.electronAPI.addStepToScript(created.id, 'echo scheduled-ok', null, 'Echo')
      if (withApproval) {
        script = await window.electronAPI.addApprovalStepToScript(created.id, 'Continue?', 'Gate')
      }
      return { project, script }
    },
    { cwd: workspaceDir, withApproval }
  )

  // The renderer loads scripts at startup, so reload to pick up the seeded data.
  await page.reload()
  await page.waitForFunction(() => Boolean(window.electronAPI?.getAppVersion))
  return { project, script }
}

async function fireDueSchedule(app, page, { project, script }) {
  const schedule = await page.evaluate(
    ({ projectId, scriptId }) =>
      window.electronAPI.saveSchedule({
        scriptId,
        projectId,
        recurrence: { kind: 'interval', everyMinutes: 5 },
        enabled: true
      }),
    { projectId: project.id, scriptId: script.id }
  )
  expect(schedule.nextRunAt).not.toBeNull()

  await app.evaluate(({ BrowserWindow }, due) => {
    BrowserWindow.getAllWindows()[0].webContents.send('schedules:due', due)
  }, schedule)
  return schedule
}

test('a due schedule runs the workflow in a background tab and records the result', async ({}, testInfo) => {
  const { app, page } = await launchTerminallySkill(testInfo)

  try {
    const seeded = await seedScheduledScript(page, testInfo, { withApproval: false })
    const schedule = await fireDueSchedule(app, page, seeded)

    await expect
      .poll(
        async () => {
          const schedules = await page.evaluate(() => window.electronAPI.getSchedules())
          return schedules.find((entry) => entry.id === schedule.id)?.lastStatus ?? null
        },
        { timeout: 30_000 }
      )
      .toBe('completed')
  } finally {
    await app.close()
  }
})

test('a scheduled workflow waiting for approval raises a tab alert', async ({}, testInfo) => {
  const { app, page } = await launchTerminallySkill(testInfo)

  try {
    const seeded = await seedScheduledScript(page, testInfo, { withApproval: true })
    await fireDueSchedule(app, page, seeded)

    const dot = page.locator('[role="status"][aria-label^="Approval needed"]')
    await expect(dot.first()).toBeVisible({ timeout: 30_000 })
  } finally {
    await app.close()
  }
})

test('privacy network log keeps only hosts and can be cleared', async ({}, testInfo) => {
  const { app, page } = await launchTerminallySkill(testInfo)

  try {
    const records = await page.evaluate(() => window.electronAPI.getNetworkLog())
    expect(Array.isArray(records)).toBe(true)
    for (const record of records) {
      expect(Object.keys(record).sort()).toEqual(['at', 'host', 'local', 'purpose', 'status'])
    }
    await page.evaluate(() => window.electronAPI.clearNetworkLog())
    expect(await page.evaluate(() => window.electronAPI.getNetworkLog())).toEqual([])
  } finally {
    await app.close()
  }
})

test('a long command finishing in a background tab raises a tab dot', async ({}, testInfo) => {
  const { app, page } = await launchTerminallySkill(testInfo)
  try {
    const workspaceDir = testInfo.outputPath('workspace')
    await mkdir(workspaceDir, { recursive: true })
    await page.evaluate(
      async (cwd) => {
        await window.electronAPI.updateSettings({ attentionAlerts: true, attentionMinSeconds: 5 })
        await window.electronAPI.createProject('E2E Attention', cwd, '#14b8a6', undefined, 'disabled', true)
      },
      workspaceDir
    )
    await page.reload()
    await page.waitForFunction(() => Boolean(window.electronAPI?.getAppVersion))

    const input = page.locator('.xterm-helper-textarea').first()
    await input.waitFor({ state: 'attached', timeout: 20_000 })
    await page.waitForTimeout(2000)
    await input.focus()
    await page.keyboard.type('sleep 6')
    await page.keyboard.press('Enter')

    // Move to a second tab so the first one is no longer being watched.
    await page.locator('button.p-2:has(svg.lucide-plus)').last().click()
    await expect(page.getByRole('status')).toHaveCount(1, { timeout: 20_000 })
  } finally {
    await app.close()
  }
})
