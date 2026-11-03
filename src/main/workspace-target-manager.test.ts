import { describe, expect, it, vi } from 'vitest'
import { createLocalWorkspaceTarget, createSSHWorkspaceTarget } from '../shared/project-schema'
import { testWorkspaceTargetConnection } from './workspace-target-manager'
import type { ExecFileException } from 'child_process'

type ExecCallback = (error: ExecFileException | null, stdout: string, stderr: string) => void

describe('workspace-target-manager', () => {
  it('returns success immediately for local workspaces', async () => {
    await expect(
      testWorkspaceTargetConnection(createLocalWorkspaceTarget('/repo'))
    ).resolves.toEqual({
      ok: true,
      message: 'Local workspace is ready.'
    })
  })

  it('returns a success message for a working ssh target', async () => {
    const exec = vi.fn((
      _command: string,
      _args: readonly string[],
      _options: { timeout: number },
      callback: ExecCallback
    ) => {
      callback(null, '/srv/app\n', '')
    })

    await expect(
      testWorkspaceTargetConnection(
        createSSHWorkspaceTarget('prod.example.com', 'deploy', '/srv/app', 2222),
        exec
      )
    ).resolves.toEqual({
      ok: true,
      message: 'SSH connection succeeded. Remote cwd: /srv/app'
    })
  })

  it('maps missing ssh binaries to a clear error', async () => {
    const exec = vi.fn((
      _command: string,
      _args: readonly string[],
      _options: { timeout: number },
      callback: ExecCallback
    ) => {
      callback(Object.assign(new Error('spawn ssh ENOENT'), { code: 'ENOENT', cmd: 'ssh' }), '', '')
    })

    await expect(
      testWorkspaceTargetConnection(
        createSSHWorkspaceTarget('prod.example.com', 'deploy', '/srv/app'),
        exec
      )
    ).resolves.toEqual({
      ok: false,
      message: 'OpenSSH is not available on PATH.'
    })
  })

  it('surfaces permission errors from ssh output', async () => {
    const exec = vi.fn((
      _command: string,
      _args: readonly string[],
      _options: { timeout: number },
      callback: ExecCallback
    ) => {
      callback(
        Object.assign(new Error('ssh exited'), { code: 255, cmd: 'ssh' }),
        '',
        'Permission denied (publickey).'
      )
    })

    await expect(
      testWorkspaceTargetConnection(
        createSSHWorkspaceTarget('prod.example.com', 'deploy', '/srv/app'),
        exec
      )
    ).resolves.toEqual({
      ok: false,
      message: 'SSH authentication failed. Check your user, key, or agent.'
    })
  })
})
