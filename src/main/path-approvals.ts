import { resolve } from 'path'

export type ApprovedExternalPathKind = 'file' | 'directory'

export interface ApprovedExternalPath {
  kind: ApprovedExternalPathKind
  path: string
}

const approvedExternalPaths = new Map<string, ApprovedExternalPath>()

function normalizeApprovedPath(pathValue: string): string {
  return resolve(pathValue)
}

export function approveExternalPath(
  pathValue: string,
  kind: ApprovedExternalPathKind
): ApprovedExternalPath {
  const approvedPath: ApprovedExternalPath = {
    kind,
    path: normalizeApprovedPath(pathValue)
  }
  approvedExternalPaths.set(`${approvedPath.kind}:${approvedPath.path}`, approvedPath)
  return approvedPath
}

export function getApprovedExternalPaths(): ApprovedExternalPath[] {
  return [...approvedExternalPaths.values()]
}

export function resetApprovedExternalPathsForTests(): void {
  approvedExternalPaths.clear()
}
