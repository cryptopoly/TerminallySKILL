import { describe, expect, it, vi, afterEach } from 'vitest'

vi.mock('./ipc', () => ({
  registerAppIpcHandlers: vi.fn(),
  registerCommandIpcHandlers: vi.fn(),
  registerFileIpcHandlers: vi.fn(),
  registerLogIpcHandlers: vi.fn(),
  registerProjectIpcHandlers: vi.fn(),
  registerScriptIpcHandlers: vi.fn(),
  registerSettingsIpcHandlers: vi.fn(),
  registerSnippetIpcHandlers: vi.fn(),
  registerTerminalIpcHandlers: vi.fn(),
  registerVncIpcHandlers: vi.fn()
}))

import {
  registerAppIpcHandlers,
  registerCommandIpcHandlers,
  registerFileIpcHandlers,
  registerLogIpcHandlers,
  registerProjectIpcHandlers,
  registerScriptIpcHandlers,
  registerSettingsIpcHandlers,
  registerSnippetIpcHandlers,
  registerTerminalIpcHandlers,
  registerVncIpcHandlers
} from './ipc'
import { registerIpcHandlers } from './ipc-handlers'

describe('registerIpcHandlers', () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  it('registers each domain handler group exactly once', () => {
    registerIpcHandlers()

    expect(registerAppIpcHandlers).toHaveBeenCalledTimes(1)
    expect(registerCommandIpcHandlers).toHaveBeenCalledTimes(1)
    expect(registerFileIpcHandlers).toHaveBeenCalledTimes(1)
    expect(registerLogIpcHandlers).toHaveBeenCalledTimes(1)
    expect(registerProjectIpcHandlers).toHaveBeenCalledTimes(1)
    expect(registerScriptIpcHandlers).toHaveBeenCalledTimes(1)
    expect(registerSettingsIpcHandlers).toHaveBeenCalledTimes(1)
    expect(registerSnippetIpcHandlers).toHaveBeenCalledTimes(1)
    expect(registerTerminalIpcHandlers).toHaveBeenCalledTimes(1)
    expect(registerVncIpcHandlers).toHaveBeenCalledTimes(1)
  })
})
