/**
 * Windows terminals use node-pty's bundled conpty.dll and OpenConsole.exe, which pass command anchors
 * through in order. TSK_CONPTY_DLL=0 goes back to the ConPTY built into Windows (decision D0041).
 */
export function usesBundledConpty(platform: string, env: Record<string, string | undefined>): boolean {
  return platform === 'win32' && env.TSK_CONPTY_DLL !== '0'
}
