import type { WorkflowInputValues } from './workflow-execution'

export type RunSource = 'workflow'

export type RunStatus =
  | 'running'
  | 'waiting_for_shell'
  | 'waiting_for_delay'
  | 'awaiting_approval'
  | 'running_command'
  | 'completed'
  | 'failed'
  | 'cancelled'

export type RunStepStatus = 'pending' | 'running' | 'completed' | 'failed'

export interface TerminalSessionInfo {
  cwd: string
  startedAt: string
  shell: string
  shellState: 'init' | 'idle' | 'executing'
  projectId: string | null
  projectName: string | null
  projectWorkingDir: string | null
}

interface RunStepBase {
  stepId: string
  sourceIndex: number
  label: string
  status: RunStepStatus
  attempts: number
  exitCode: number | null
  startedAt: string | null
  endedAt: string | null
}

export interface RunCommandStepRecord extends RunStepBase {
  type: 'command'
  commandString: string
  continueOnError: boolean
  delayMs: number
  retryCount: number
}

export interface RunApprovalStepRecord extends RunStepBase {
  type: 'approval'
  message: string
  requireConfirmation: boolean
}

export interface RunNoteStepRecord extends RunStepBase {
  type: 'note'
  content: string
}

export type RunStepRecord =
  | RunCommandStepRecord
  | RunApprovalStepRecord
  | RunNoteStepRecord

export interface RunRecord {
  runId: string
  source: RunSource
  sessionId: string
  scriptId: string
  scriptName: string
  projectId: string | null
  projectName: string | null
  /** Set when a schedule started the run; absent or null for runs started by hand. */
  scheduleId?: string | null
  cwd: string | null
  shell: string | null
  logFilePath: string | null
  startedAt: string
  endedAt: string | null
  status: RunStatus
  error: string | null
  inputValues: WorkflowInputValues
  steps: RunStepRecord[]
}

export interface RunsData {
  runs: RunRecord[]
}
