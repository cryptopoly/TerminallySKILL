import { describe, expect, it } from 'vitest'
import {
  isRejectedHelpOutput,
  looksLikeReferenceHelpOutput,
  parseDescription,
  parseLegacyCommands,
  parseLineCommandList,
  parseOptions,
  parsePositionalArgs
} from './help-parser'

describe('help-parser', () => {
  it('extracts the description after the usage line when present', () => {
    const helpText = `
Usage: acme deploy [options]

Deploy the current build to the selected environment.

Options:
  -e, --env <name>        Target environment
  --timeout <seconds>     Timeout value
`

    expect(parseDescription(helpText)).toBe(
      'Deploy the current build to the selected environment.'
    )
  })

  it('does not treat example usage headings as the command description', () => {
    const helpText = `
Usage: brew COMMAND

Example usage:
  brew search TEXT|/REGEX/

Commands:
  install     Install a formula or cask
`

    expect(parseDescription(helpText)).toBe('No description available')
  })

  it('does not treat [options...] as a real positional argument', () => {
    const helpText = `
Usage: curl [options...] <url>
`

    expect(parsePositionalArgs(helpText, 'curl')).toEqual([
      {
        id: 'url',
        label: 'url',
        type: 'string',
        required: true,
        variadic: false,
        position: 0
      }
    ])
  })

  it('parses common boolean and value-taking flags while skipping universal help/version flags', () => {
    const helpText = `
Options:
  -h, --help              Show help
  -V, --version           Show version
  -f, --force             Force the operation
  -m, --message <text>    Message body
  --timeout=SECONDS       Timeout value
  --no-color              Disable ANSI colors
`

    expect(parseOptions(helpText)).toEqual([
      {
        id: 'force',
        short: '-f',
        long: '--force',
        label: 'force',
        description: 'Force the operation',
        type: 'boolean',
        separator: undefined
      },
      {
        id: 'message',
        short: '-m',
        long: '--message',
        label: 'message',
        description: 'Message body',
        type: 'string',
        separator: 'space'
      },
      {
        id: 'timeout',
        short: undefined,
        long: '--timeout',
        label: 'timeout',
        description: 'Timeout value',
        type: 'string',
        separator: 'equals'
      },
      {
        id: 'no_color',
        short: undefined,
        long: '--no-color',
        label: 'no color',
        description: 'Disable ANSI colors',
        type: 'boolean',
        separator: undefined
      }
    ])
  })

  it('parses git-style indented command lists with descriptions', () => {
    const helpText = `
See 'git help <command>' to read about a specific subcommand

Main Porcelain Commands
   add                     Add file contents to the index
   branch                  List, create, or delete branches
   commit                  Record changes to the repository
   status                  Show the working tree status
`

    expect(parseLegacyCommands(helpText)).toEqual([
      { name: 'add', description: 'Add file contents to the index' },
      { name: 'branch', description: 'List, create, or delete branches' },
      { name: 'commit', description: 'Record changes to the repository' },
      { name: 'status', description: 'Show the working tree status' }
    ])
  })

  it('parses docker-style command sections with qualifier headings', () => {
    const helpText = `
Usage:  docker [OPTIONS] COMMAND

Common Commands:
  run         Create and run a new container from an image
  exec        Execute a command in a running container

Management Commands:
  image       Manage images
  volume      Manage volumes
`

    expect(parseLegacyCommands(helpText)).toEqual([
      { name: 'run', description: '' },
      { name: 'exec', description: '' },
      { name: 'image', description: '' },
      { name: 'volume', description: '' }
    ])
  })

  it('parses simple newline-delimited command lists such as brew commands --quiet', () => {
    const helpText = `
--cache
install
update
upgrade
help
doctor
`

    expect(parseLineCommandList(helpText)).toEqual([
      { name: 'install', description: '' },
      { name: 'update', description: '' },
      { name: 'upgrade', description: '' },
      { name: 'doctor', description: '' }
    ])
  })

  it('parses positional arguments from concise git-style usage output', () => {
    const helpText = `
usage: git checkout [<options>] <branch>
   or: git checkout [<options>] [<branch>] -- <file>...
`

    expect(parsePositionalArgs(helpText, 'git', ['checkout'])).toEqual([
      {
        id: 'branch',
        label: 'branch',
        type: 'string',
        required: false,
        variadic: false,
        position: 0
      },
      {
        id: 'file',
        label: 'file',
        type: 'file-path',
        required: true,
        variadic: true,
        position: 1
      }
    ])
  })

  it('parses positional arguments from BSD-style root usage output', () => {
    const helpText = `
usage: cp [-R [-H | -L | -P]] [-fi | -n] [-aclpSsvXx] source_file target_file
       cp [-R [-H | -L | -P]] [-fi | -n] [-aclpSsvXx] source_file ... target_directory
`

    expect(parsePositionalArgs(helpText, 'cp')).toEqual([
      {
        id: 'source_file',
        label: 'source file',
        type: 'file-path',
        required: true,
        variadic: true,
        position: 0
      },
      {
        id: 'target_path',
        label: 'target path',
        type: 'file-path',
        required: true,
        variadic: false,
        position: 1
      }
    ])
  })

  it('treats rejected --help output as invalid help so we can fall back to other strategies', () => {
    const helpText = 'diskutil: did not recognize verb "--help"; type "diskutil" for a list'

    expect(isRejectedHelpOutput(helpText, ['--help'])).toBe(true)
  })

  it('does not reject valid subcommand help just because it mentions the subcommand name', () => {
    const helpText = `
Usage: acme config [options]

Manage unknown environments and local config safely.

Options:
  --env <name>     Target environment
  --json           Output JSON
`

    expect(isRejectedHelpOutput(helpText, ['config', '--help'])).toBe(false)
  })

  it('does not treat a plain directory listing as fallback help output', () => {
    const output = `
src
dist
package.json
README.md
`

    expect(looksLikeReferenceHelpOutput(output, 'ls')).toBe(false)
  })

  it('accepts legacy usage output as fallback help output', () => {
    const output = `
usage: chmod [-R [-H | -L | -P]] mode file ...
`

    expect(looksLikeReferenceHelpOutput(output, 'chmod')).toBe(true)
  })

  describe('parseOptions layouts from real CLIs', () => {
    const byLong = (text: string) => Object.fromEntries(parseOptions(text).map((o) => [o.long ?? o.short, o]))

    it('reads Cobra-style bare type words as values (gh --title string)', () => {
      const options = byLong(`
Flags:
  -t, --title string   Title for the pull request
  -d, --draft          Mark pull request as a draft
  -a, --assignee login  Assign people
`)
      expect(options['--title']).toMatchObject({ type: 'string', separator: 'space', short: '-t' })
      expect(options['--draft']).toMatchObject({ type: 'boolean' })
      expect(options['--assignee']).toMatchObject({ type: 'string' })
    })

    it('reads flags whose description is on the following lines (ripgrep, node, clap)', () => {
      const options = byLong(`
    --pre=COMMAND
        For each input PATH, this flag causes ripgrep to search the output.

    -A, --after-context=NUM
        Show NUM lines after each match.

  --abort-on-uncaught-exception
                              aborting instead of exiting causes a
                              core file to be generated

  -q, --quiet...
          Use quiet output
`)
      expect(options['--pre']).toMatchObject({
        type: 'string',
        separator: 'equals',
        description: 'For each input PATH, this flag causes ripgrep to search the output.'
      })
      expect(options['--after-context']).toMatchObject({ short: '-A', separator: 'equals' })
      expect(options['--abort-on-uncaught-exception']).toMatchObject({
        type: 'boolean',
        description: 'aborting instead of exiting causes a'
      })
      expect(options['--quiet']).toMatchObject({ short: '-q', type: 'boolean' })
    })

    it('handles a double space after the short flag and single-space indents', () => {
      const options = byLong(`
  -b,  --background                go to background after startup
 -E, --cert <certificate[:password]>  Client certificate file and password
`)
      expect(options['--background']).toMatchObject({ short: '-b', type: 'boolean' })
      expect(options['--cert']).toMatchObject({ short: '-E', type: 'string' })
    })

    it('keeps -v when it is a verbose short for a long flag', () => {
      expect(byLong(`
  -v, --verbose        Be chatty
  -V, --version        Print version
`)['--verbose']).toMatchObject({ short: '-v' })
    })

    it('does not treat dash-led lines inside a wrapped description as flags', () => {
      const options = parseOptions(`
  --python-version <v>        The Python interpreter version to use for wheel
                              compatibility, specified like
                              --implementation, --platform, and --abi together.
  --abi <abi>                 Use ABI
`)
      expect(options.map((o) => o.long)).toEqual(['--python-version', '--abi'])
    })
  })
})

