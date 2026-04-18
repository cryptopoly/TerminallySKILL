import { beforeEach, describe, expect, it } from 'vitest'
import { resolve } from 'path'
import {
  approveExternalPath,
  getApprovedExternalPaths,
  resetApprovedExternalPathsForTests
} from './path-approvals'

describe('path-approvals', () => {
  beforeEach(() => {
    resetApprovedExternalPathsForTests()
  })

  it('stores normalized approved paths and deduplicates identical approvals', () => {

    approveExternalPath('/tmp/example/../picked.txt', 'file')
    approveExternalPath('/tmp/picked.txt', 'file')
    approveExternalPath('/tmp/workspace', 'directory')

    expect(getApprovedExternalPaths()).toEqual([
      { kind: 'file', path: resolve('/tmp/picked.txt') },
      { kind: 'directory', path: resolve('/tmp/workspace') }
    ])
  })

  it('clears approved paths on reset', () => {
    approveExternalPath('/tmp/picked.txt', 'file')

    resetApprovedExternalPathsForTests()

    expect(getApprovedExternalPaths()).toEqual([])
  })

  it('treats file and directory approvals of the same path as distinct entries', () => {
    approveExternalPath('/tmp/shared', 'file')
    approveExternalPath('/tmp/shared', 'directory')

    const approvals = getApprovedExternalPaths()
    expect(approvals).toHaveLength(2)
    expect(approvals).toContainEqual({ kind: 'file', path: resolve('/tmp/shared') })
    expect(approvals).toContainEqual({ kind: 'directory', path: resolve('/tmp/shared') })
  })

  it('resolves relative paths against the process cwd', () => {
    approveExternalPath('./relative/path.txt', 'file')

    const approvals = getApprovedExternalPaths()
    expect(approvals).toHaveLength(1)
    expect(approvals[0].path).toBe(resolve('./relative/path.txt'))
    // Must be absolute after resolve()
    expect(approvals[0].path.startsWith('/') || /^[A-Za-z]:/.test(approvals[0].path)).toBe(true)
  })

  it('collapses repeated approvals of the same normalized path', () => {
    approveExternalPath('/tmp/dup.txt', 'file')
    approveExternalPath('/tmp/./dup.txt', 'file')
    approveExternalPath('/tmp/other/../dup.txt', 'file')

    expect(getApprovedExternalPaths()).toEqual([
      { kind: 'file', path: resolve('/tmp/dup.txt') }
    ])
  })
})
