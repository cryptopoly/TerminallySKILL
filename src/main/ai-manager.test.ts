import { describe, expect, it, vi } from 'vitest'
import type { CommandDefinition } from '../shared/command-schema'

vi.mock('./settings-manager', () => ({
  getSettings: vi.fn()
}))

import {
  buildArtifactImprovementPrompt,
  buildCommandExplainPrompt,
  buildCommandGenerationPrompt,
  buildCommandHelpPrompt,
  buildCommandReviewPrompt,
  buildCommandTreeGenerationPrompt,
  buildOutputReviewPrompt,
  extractSuggestedCommands,
  coerceGeneratedCommandValues,
  extractAnthropicText,
  extractOllamaText,
  extractOpenAIText,
  parseCommandHelpResponse,
  parseCommandTreeGenerationResponse,
  parseCommandGenerationResponse,
  sanitizeAIText
} from './ai-manager'

describe('ai-manager helpers', () => {
  it('builds a structured command review prompt', () => {
    const prompt = buildCommandReviewPrompt({
      action: 'command-review',
      commandName: 'git push',
      commandString: 'git push origin main',
      commandDescription: 'Push local changes to the remote branch'
    })

    expect(prompt.instructions).toContain('Summary')
    expect(prompt.instructions).toContain('Examples')
    expect(prompt.input).toContain('Command name: git push')
    expect(prompt.input).toContain('Command string: git push origin main')
    expect(prompt.input).toContain('Description: Push local changes to the remote branch')
  })

  it('builds a focused command explain prompt', () => {
    const prompt = buildCommandExplainPrompt({
      action: 'command-explain',
      commandName: 'openclaw --dev',
      commandString: 'openclaw --dev',
      commandDescription: 'Use the isolated dev profile'
    })

    expect(prompt.instructions).toContain('Overview')
    expect(prompt.instructions).toContain('Explanation')
    expect(prompt.instructions).toContain('Example')
    expect(prompt.instructions).toContain('exactly three short sections')
    expect(prompt.input).toContain('Command name: openclaw --dev')
    expect(prompt.input).toContain('Command string: openclaw --dev')
    expect(prompt.input).toContain('Description: Use the isolated dev profile')
  })

  it('builds a saved CLI help prompt for AI fallback help', () => {
    const prompt = buildCommandHelpPrompt({
      action: 'command-help',
      command: {
        id: 'ls-root',
        name: 'ls',
        executable: 'ls',
        description: 'ls command-line tool',
        category: 'ls'
      },
      cwd: '/tmp/project'
    })

    expect(prompt.instructions).toContain('"overview":"string"')
    expect(prompt.instructions).toContain('"commonOptions"')
    expect(prompt.instructions).toContain('Return strict JSON only')
    expect(prompt.instructions).toContain('"examples"')
    expect(prompt.instructions).toContain('"platformNotes"')
    expect(prompt.input).toContain('Command name: ls')
    expect(prompt.input).toContain('Executable: ls')
    expect(prompt.input).toContain('Working directory: /tmp/project')
    expect(prompt.input).toContain('Platform context:')
    expect(prompt.input).toContain('Coverage preference: comprehensive practical option inventory')
  })

  it('builds a structured command generation prompt', () => {
    const prompt = buildCommandGenerationPrompt({
      action: 'command-generation',
      prompt: 'Generate a safe dry-run deploy to staging with verbose output',
      cwd: '/tmp/app',
      currentValues: { dry_run: true },
      command: {
        id: 'cmd-1',
        name: 'deploy',
        executable: 'deployctl',
        description: 'Deploy the application',
        category: 'Deploy',
        options: [
          {
            id: 'env',
            long: '--env',
            label: 'Environment',
            type: 'enum',
            choices: [
              { value: 'staging', label: 'Staging' },
              { value: 'prod', label: 'Production' }
            ]
          }
        ]
      }
    })

    expect(prompt.instructions).toContain('Return strict JSON only')
    expect(prompt.input).toContain('User request: Generate a safe dry-run deploy to staging with verbose output')
    expect(prompt.input).toContain('Working directory: /tmp/app')
    expect(prompt.input).toContain('"id": "env"')
    expect(prompt.input).toContain('"dry_run": true')
  })

  it('builds a structured command tree generation prompt', () => {
    const prompt = buildCommandTreeGenerationPrompt({
      action: 'command-tree-generation',
      command: {
        id: 'cmd-tree',
        name: 'docker',
        executable: 'docker',
        description: 'A self-sufficient runtime for containers',
        category: 'docker'
      },
      knownSubcommands: [
        { name: 'run', description: 'Run a container from an image' },
        { name: 'build', description: 'Build an image from a Dockerfile' }
      ]
    })

    expect(prompt.instructions).toContain('Only include top-level subcommands')
    expect(prompt.input).toContain('Executable: docker')
    expect(prompt.input).toContain('Current description: A self-sufficient runtime for containers')
    expect(prompt.input).toContain('Known top-level subcommands already discovered')
    expect(prompt.input).toContain('"name": "run"')
  })

  it('builds a structured artifact improvement prompt', () => {
    const prompt = buildArtifactImprovementPrompt({
      action: 'artifact-improvement',
      artifactType: 'script',
      title: 'Deploy',
      description: 'Build and publish the app',
      content: '1. npm ci\n2. npm run build\n3. npm publish'
    })

    expect(prompt.instructions).toContain('Improved Version')
    expect(prompt.input).toContain('Artifact type: script')
    expect(prompt.input).toContain('Title: Deploy')
    expect(prompt.input).toContain('Description: Build and publish the app')
    expect(prompt.input).toContain('Current content:')
    expect(prompt.input).toContain('npm run build')
  })

  it('builds a structured output review prompt and keeps the latest transcript tail', () => {
    const prompt = buildOutputReviewPrompt({
      action: 'output-review',
      source: 'log',
      focus: 'command-block',
      title: 'term-7',
      cwd: '/tmp/app',
      shell: '/bin/zsh',
      exitCode: 1,
      transcript: `Start marker\n${'x'.repeat(12_500)}\nFinal error line`
    })

    expect(prompt.instructions).toContain('Likely Cause')
    expect(prompt.input).toContain('Source: Saved terminal log')
    expect(prompt.input).toContain('Focus: Most recent command block only')
    expect(prompt.input).toContain('Title: term-7')
    expect(prompt.input).toContain('Working directory: /tmp/app')
    expect(prompt.input).toContain('Shell: /bin/zsh')
    expect(prompt.input).toContain('Exit code: 1')
    expect(prompt.input).toContain('Transcript note: Transcript was truncated')
    expect(prompt.input).toContain('Final error line')
    expect(prompt.input).not.toContain('Start marker')
  })

  it('extracts text from supported provider payloads', () => {
    expect(extractOpenAIText({ output_text: 'Summary\nSafe enough.' })).toBe(
      'Summary\nSafe enough.'
    )

    expect(
      extractAnthropicText({
        content: [{ type: 'text', text: 'Summary\nAnthropic response.' }]
      })
    ).toBe('Summary\nAnthropic response.')

    expect(
      extractOllamaText({
        message: { content: 'Summary\nOllama response.' }
      })
    ).toBe('Summary\nOllama response.')
  })

  it('strips thinking blocks and labels from AI responses', () => {
    expect(
      sanitizeAIText('<think>private reasoning</think>\nSummary\nSafe enough.')
    ).toBe('Summary\nSafe enough.')

    expect(
      sanitizeAIText('Thinking: let me reason about this\nSummary\nDone.')
    ).toBe('Summary\nDone.')
  })

  it('falls back gracefully when command generation is not valid JSON', () => {
    const command = {
      id: 'cmd-2',
      name: 'openclaw',
      executable: 'openclaw',
      description: 'Gateway manager',
      category: 'openclaw'
    } as const

    expect(
      parseCommandGenerationResponse(
        command,
        'Here is a safe suggestion:\n\nRestart the gateway using the dedicated restart subcommand if available.'
      )
    ).toEqual({
      summary: 'Here is a safe suggestion:',
      warnings: ['AI response could not be converted into builder values automatically.'],
      values: {}
    })
  })

  it('parses AI-generated command trees', () => {
    const command = {
      id: 'docker-root',
      name: 'docker',
      executable: 'docker',
      description: 'Docker root',
      category: 'docker'
    } as const

    expect(
      parseCommandTreeGenerationResponse(
        command,
        JSON.stringify({
          rootDescription: 'Docker command-line tool',
          warnings: ['Verify platform-specific flags before use.'],
          rootOptions: [
            {
              id: 'host',
              long: '--host',
              label: 'host',
              type: 'string',
              description: 'Daemon socket to connect to'
            }
          ],
          rootPositionalArgs: [
            {
              id: 'image',
              label: 'image',
              type: 'string',
              required: true,
              position: 0
            }
          ],
          subcommands: [
            {
              name: 'run',
              description: 'Run a container from an image',
              positionalArgs: [
                {
                  id: 'image',
                  label: 'image',
                  type: 'string',
                  required: true,
                  position: 0
                }
              ],
              options: [
                {
                  long: '--rm',
                  label: 'rm',
                  type: 'boolean',
                  description: 'Automatically remove the container when it exits'
                }
              ]
            }
          ]
        })
      )
    ).toEqual({
      rootDescription: 'Docker command-line tool',
      warnings: ['Verify platform-specific flags before use.'],
      rootOptions: [
        {
          id: 'host',
          long: '--host',
          short: undefined,
          label: 'host',
          type: 'string',
          separator: undefined,
          description: 'Daemon socket to connect to',
          required: false,
          repeatable: false,
          choices: undefined,
          order: 0
        }
      ],
      rootPositionalArgs: [
        {
          id: 'image',
          label: 'image',
          type: 'string',
          required: true,
          variadic: false,
          position: 0,
          description: undefined
        }
      ],
      subcommands: [
        {
          name: 'run',
          description: 'Run a container from an image',
          positionalArgs: [
            {
              id: 'image',
              label: 'image',
              type: 'string',
              required: true,
              variadic: false,
              position: 0,
              description: undefined
            }
          ],
          options: [
            {
              id: 'rm',
              label: 'rm',
              type: 'boolean',
              short: undefined,
              long: '--rm',
              separator: undefined,
              description: 'Automatically remove the container when it exits',
              required: false,
              repeatable: false,
              choices: undefined,
              order: 0
            }
          ]
        }
      ]
    })
  })

  it('parses structured AI-generated CLI help', () => {
    const command = {
      id: 'ls-root',
      name: 'ls',
      executable: 'ls',
      description: 'ls command-line tool',
      category: 'ls'
    } as const

    expect(
      parseCommandHelpResponse(
        command,
        JSON.stringify({
          overview: 'List directory contents with platform-specific flags.',
          commonOptions: [
            {
              title: 'Display',
              rows: [
                { label: '-l, --long', description: 'Show detailed file metadata.' },
                { label: '-a, --all', description: 'Include dotfiles.' }
              ]
            }
          ],
          arguments: [
            { label: 'path', description: 'Path to list.', required: false }
          ],
          examples: [
            { command: 'ls -la', description: 'Show all files with details.' }
          ],
          platformNotes: ['GNU/Linux supports --color while macOS/BSD uses -G.'],
          cautions: ['Some flags differ across GNU/Linux and BSD/macOS.']
        })
      )
    ).toEqual({
      overview: 'List directory contents with platform-specific flags.',
      commonOptions: [
        {
          title: 'Display',
          rows: [
            { label: '-l, --long', description: 'Show detailed file metadata.', platform: undefined, required: undefined },
            { label: '-a, --all', description: 'Include dotfiles.', platform: undefined, required: undefined }
          ]
        }
      ],
      arguments: [
        { label: 'path', description: 'Path to list.', platform: undefined, required: false }
      ],
      examples: [
        { command: 'ls -la', description: 'Show all files with details.' }
      ],
      platformNotes: ['GNU/Linux supports --color while macOS/BSD uses -G.'],
      cautions: ['Some flags differ across GNU/Linux and BSD/macOS.']
    })
  })

  it('coerces and parses generated command values against the command schema', () => {
    const command: CommandDefinition = {
      id: 'cmd-1',
      name: 'deploy',
      executable: 'deployctl',
      description: 'Deploy the application',
      category: 'Deploy',
      options: [
        {
          id: 'verbose',
          long: '--verbose',
          label: 'Verbose',
          type: 'boolean'
        },
        {
          id: 'retries',
          long: '--retries',
          label: 'Retries',
          type: 'number'
        },
        {
          id: 'env',
          long: '--env',
          label: 'Environment',
          type: 'enum',
          choices: [
            { value: 'staging', label: 'Staging' },
            { value: 'prod', label: 'Production' }
          ]
        },
        {
          id: 'tag',
          long: '--tag',
          label: 'Tag',
          type: 'repeatable'
        }
      ],
      positionalArgs: [
        {
          id: 'service',
          label: 'Service',
          type: 'string',
          required: true,
          position: 0
        }
      ]
    }

    expect(
      coerceGeneratedCommandValues(command, {
        verbose: 'true',
        retries: '3',
        env: 'staging',
        tag: ['blue', 'green'],
        service: 'web',
        ignored: 'value'
      })
    ).toEqual({
      verbose: true,
      retries: 3,
      env: 'staging',
      tag: ['blue', 'green'],
      service: 'web'
    })

    expect(
      parseCommandGenerationResponse(
        command,
        '```json\n{"summary":"Deploy staging","warnings":["Review the target"],"values":{"verbose":true,"env":"staging","service":"web","ignored":"x"}}\n```'
      )
    ).toEqual({
      summary: 'Deploy staging',
      warnings: ['Review the target'],
      values: {
        verbose: true,
        env: 'staging',
        service: 'web'
      }
    })
  })
})

describe('failed command fixes', () => {
  const failed = {
    action: 'output-review' as const,
    source: 'terminal' as const,
    focus: 'command-block' as const,
    title: 'Last command: git pusg',
    transcript: 'git: \'pusg\' is not a git command.',
    exitCode: 1
  }

  it('asks for fenced single-line fixes only when the command failed', () => {
    expect(buildOutputReviewPrompt(failed).instructions).toContain('fenced code block')
    expect(buildOutputReviewPrompt({ ...failed, exitCode: 0 }).instructions).not.toContain('fenced code block')
    expect(buildOutputReviewPrompt({ ...failed, focus: 'session' }).instructions).not.toContain('fenced code block')
  })

  it('extracts only single-line commands from fenced blocks', () => {
    const content = [
      'Next Steps',
      '```bash',
      '$ git push origin main',
      '```',
      '```sh',
      'cat <<EOF',
      'multi line',
      'EOF',
      '```',
      '```',
      'git push origin main',
      '```',
      '```',
      'git status',
      '```'
    ].join('\n')

    expect(extractSuggestedCommands(content)).toEqual(['git push origin main', 'git status'])
  })

  it('limits the number of suggestions', () => {
    const content = ['a', 'b', 'c', 'd'].map((c) => '```\n' + c + '\n```').join('\n')
    expect(extractSuggestedCommands(content)).toEqual(['a', 'b', 'c'])
  })
})

