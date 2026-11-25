import { describe, expect, it } from 'vitest'
import type { Project } from './project-schema'
import { createLocalWorkspaceTarget, createSSHWorkspaceTarget, findProjectWithSameWorkspace } from './project-schema'

const local = (name: string, dir: string) => ({ name, workingDirectory: dir, workspaceTarget: createLocalWorkspaceTarget(dir) })
const ssh = (name: string, host: string, dir: string, user = 'dan', port: number | null = null) => ({
  name,
  workingDirectory: dir,
  workspaceTarget: createSSHWorkspaceTarget(host, user, dir, port, null, null, null)
})

describe('findProjectWithSameWorkspace', () => {
  const projects = [local('App', '/Users/dan/app'), ssh('WSL', 'wsl', ''), ssh('Box', 'box.local', '/srv/app')] as unknown as Project[]

  it('matches a local folder already used by another local project', () => {
    expect(findProjectWithSameWorkspace(projects, createLocalWorkspaceTarget('/users/dan/APP'))?.name).toBe('App')
  })

  it('ignores SSH projects with no folder', () => {
    expect(findProjectWithSameWorkspace(projects, createSSHWorkspaceTarget('other', 'dan', '', null, null, null, null))).toBeUndefined()
  })

  it('does not match a local folder against a remote one with the same path', () => {
    expect(findProjectWithSameWorkspace(projects, createLocalWorkspaceTarget('/srv/app'))).toBeUndefined()
  })

  it('matches SSH folders only on the same host, user and port', () => {
    const target = (host: string, user = 'dan', port: number | null = null) =>
      createSSHWorkspaceTarget(host, user, '/srv/app', port, null, null, null)
    expect(findProjectWithSameWorkspace(projects, target('BOX.local', 'dan', 22))?.name).toBe('Box')
    expect(findProjectWithSameWorkspace(projects, target('other.local'))).toBeUndefined()
    expect(findProjectWithSameWorkspace(projects, target('box.local', 'root'))).toBeUndefined()
    expect(findProjectWithSameWorkspace(projects, target('box.local', 'dan', 2222))).toBeUndefined()
  })
})
