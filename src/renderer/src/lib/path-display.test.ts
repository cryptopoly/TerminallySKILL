import { describe, expect, it } from 'vitest'
import { shortenPathForDisplay } from './path-display'

describe('shortenPathForDisplay', () => {
  it('shows the home folder as ~', () => {
    expect(shortenPathForDisplay('/Users/dan')).toBe('~')
    expect(shortenPathForDisplay('/home/dan/app')).toBe('~/app')
    expect(shortenPathForDisplay('C:\\Users\\dan\\app')).toBe('~\\app')
  })

  it('keeps the last two folders of a long path', () => {
    expect(shortenPathForDisplay('/Users/dan/TerminallySKILL/.claude/worktrees/command-blocks/test-results')).toBe(
      '~/…/command-blocks/test-results'
    )
    expect(shortenPathForDisplay('/srv/a-very-long-folder-name/another-long-folder/app/src')).toBe('/…/app/src')
    expect(shortenPathForDisplay('C:\\Projects\\a-very-long-folder-name\\another-long-folder\\app')).toBe(
      '\\…\\another-long-folder\\app'
    )
  })

  it('leaves short paths alone', () => {
    expect(shortenPathForDisplay('/srv/app')).toBe('/srv/app')
  })
})
