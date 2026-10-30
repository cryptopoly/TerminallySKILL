import { afterEach, describe, expect, it } from 'vitest'
import { extractShellPath, getShellPathProbeArgs } from './command-detector'

describe('command-detector', () => {
  describe('extractShellPath', () => {
    it('extracts a probed PATH even when shell startup output is noisy', () => {
      const output = [
        'Last login: Wed Mar 18 12:00:00 on ttys001',
        'compinit: insecure directories, run compaudit for list.',
        '__TV_PATH_START__/opt/homebrew/bin:/Users/dan/.local/bin:/usr/bin__TV_PATH_END__'
      ].join('\n')

      expect(extractShellPath(output)).toBe('/opt/homebrew/bin:/Users/dan/.local/bin:/usr/bin')
    })

    it('returns null when the probe markers are missing', () => {
      expect(extractShellPath('/opt/homebrew/bin:/usr/bin')).toBeNull()
    })
  })

  describe('getShellPathProbeArgs', () => {
    const originalPlatform = process.platform
    const setPlatform = (platform: NodeJS.Platform): void => {
      Object.defineProperty(process, 'platform', { value: platform, configurable: true })
    }

    afterEach(() => setPlatform(originalPlatform))

    it('uses an interactive login shell for zsh and bash outside Linux', () => {
      setPlatform('darwin')
      expect(getShellPathProbeArgs('/bin/zsh').slice(0, 3)).toEqual(['-i', '-l', '-c'])
      expect(getShellPathProbeArgs('/bin/bash').slice(0, 3)).toEqual(['-i', '-l', '-c'])
    })

    it('uses an interactive shell for fish outside Linux', () => {
      setPlatform('darwin')
      expect(getShellPathProbeArgs('/opt/homebrew/bin/fish').slice(0, 2)).toEqual(['-i', '-c'])
    })

    it('uses a login shell without -i on Linux', () => {
      setPlatform('linux')
      expect(getShellPathProbeArgs('/bin/zsh').slice(0, 2)).toEqual(['-l', '-c'])
      expect(getShellPathProbeArgs('/bin/bash').slice(0, 2)).toEqual(['-l', '-c'])
      expect(getShellPathProbeArgs('/usr/bin/fish').slice(0, 2)).toEqual(['-l', '-c'])
    })
  })
})
