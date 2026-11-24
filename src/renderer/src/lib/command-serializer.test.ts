import { describe, expect, it } from 'vitest'
import { serializeCommand } from './command-serializer'
import type { CommandDefinition } from '../../../shared/command-schema'

const definition: CommandDefinition = {
  id: 'docker-run',
  name: 'docker run',
  executable: 'docker',
  subcommands: ['run'],
  description: 'Run a container',
  category: 'docker',
  options: [
    {
      id: 'detach',
      long: '--detach',
      label: 'detach',
      type: 'boolean',
      order: 1
    },
    {
      id: 'port',
      long: '--publish',
      label: 'publish',
      type: 'string',
      separator: 'space',
      order: 2
    },
    {
      id: 'env',
      long: '--env',
      label: 'env',
      type: 'repeatable',
      separator: 'equals',
      order: 3
    }
  ],
  positionalArgs: [
    {
      id: 'image',
      label: 'image',
      type: 'string',
      position: 1
    },
    {
      id: 'cmd',
      label: 'cmd',
      type: 'string',
      variadic: true,
      position: 2
    }
  ]
}

describe('serializeCommand', () => {
  it('serializes flags, repeatable values, and escaped positional args in order', () => {
    expect(
      serializeCommand(definition, {
        detach: true,
        port: '8080:80',
        env: ['NODE_ENV=production', 'GREETING=hello world'],
        image: 'nginx:latest',
        cmd: ['sh', '-c', "echo it's live"]
      })
    ).toBe(
      "docker run --detach --publish 8080:80 --env=NODE_ENV=production --env='GREETING=hello world' nginx:latest sh -c 'echo it'\\''s live'"
    )
  })

  it('quotes values for PowerShell when that is the shell the command is typed into', () => {
    expect(
      serializeCommand(
        definition,
        {
          detach: true,
          port: '8080:80',
          env: ['NODE_ENV=production', 'GREETING=hello world', 'COST=$5', 'NAME=O\u2019Neil'],
          image: 'nginx:latest',
          cmd: ['sh', '-c', "echo it's live", '@all', 'a,b', 'C:\\Program Files\\x']
        },
        'powershell.exe'
      )
    ).toBe(
      "docker run --detach --publish 8080:80 --env=NODE_ENV=production '--env=GREETING=hello world' '--env=COST=$5' " +
        "'--env=NAME=O\u2019\u2019Neil' nginx:latest sh -c 'echo it''s live' '@all' 'a,b' 'C:\\Program Files\\x'"
    )
  })

  it('quotes a PowerShell -name.part argument, which PowerShell 5.1 would split at the dot', () => {
    const javaLike: CommandDefinition = {
      ...definition,
      options: [{ id: 'define', short: '-D', label: 'define', type: 'string', separator: 'none' }],
      positionalArgs: []
    }
    expect(serializeCommand(javaLike, { define: 'app.mode=dev' }, 'powershell.exe')).toBe("docker run '-Dapp.mode=dev'")
    expect(serializeCommand(javaLike, { define: 'app.mode=dev' }, '/bin/zsh')).toBe('docker run -Dapp.mode=dev')
  })

  it('omits empty values and enum defaults', () => {
    const enumDefinition: CommandDefinition = {
      ...definition,
      options: [
        {
          id: 'pull',
          long: '--pull',
          label: 'pull',
          type: 'enum',
          defaultValue: 'missing',
          choices: [
            { value: 'missing', label: 'missing' },
            { value: 'always', label: 'always' }
          ]
        }
      ]
    }

    expect(serializeCommand(enumDefinition, { pull: 'missing', image: 'redis' })).toBe('docker run redis')
    expect(serializeCommand(enumDefinition, { pull: 'always', image: 'redis' })).toBe('docker run --pull always redis')
  })
})
