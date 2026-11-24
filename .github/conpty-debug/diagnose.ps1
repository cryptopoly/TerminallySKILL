# TEMPORARY (branch fix/conpty-dll-server): what a process that will not exit is doing. Prints the process
# tree, its threads, any dialog windows, and native stacks when cdb.exe is on the machine.
# Removed before the branch is finished.
param([int]$TargetPid)
$ErrorActionPreference = 'Continue'

$all = Get-CimInstance Win32_Process
$tree = New-Object System.Collections.Generic.HashSet[int]
[void]$tree.Add($TargetPid)
do {
  $added = $false
  foreach ($p in $all) {
    if ($tree.Contains([int]$p.ParentProcessId) -and -not $tree.Contains([int]$p.ProcessId)) {
      [void]$tree.Add([int]$p.ProcessId)
      $added = $true
    }
  }
} while ($added)

"=== process tree of $TargetPid, and every console host or shell"
$all | Where-Object { $tree.Contains([int]$_.ProcessId) -or $_.Name -match 'OpenConsole|conhost|powershell|WerFault' } |
  Sort-Object ProcessId |
  ForEach-Object {
    $cmd = if ($_.CommandLine) { $_.CommandLine.Substring(0, [Math]::Min(150, $_.CommandLine.Length)) } else { '' }
    '{0,6} parent={1,6} {2,-18} {3}' -f $_.ProcessId, $_.ParentProcessId, $_.Name, $cmd
  }

"=== threads of $TargetPid (state, wait reason)"
try {
  (Get-Process -Id $TargetPid -ErrorAction Stop).Threads |
    Group-Object ThreadState, WaitReason |
    ForEach-Object { '{0,4} x {1}' -f $_.Count, $_.Name }
} catch { "cannot read threads: $_" }

"=== windows of the process tree, and every dialog (#32770)"
Add-Type -TypeDefinition @"
using System;
using System.Text;
using System.Collections.Generic;
using System.Runtime.InteropServices;
public static class TskWindows {
  delegate bool EnumProc(IntPtr hwnd, IntPtr lParam);
  [DllImport("user32.dll")] static extern bool EnumWindows(EnumProc callback, IntPtr lParam);
  [DllImport("user32.dll")] static extern uint GetWindowThreadProcessId(IntPtr hwnd, out uint pid);
  [DllImport("user32.dll", CharSet = CharSet.Unicode)] static extern int GetWindowText(IntPtr hwnd, StringBuilder text, int max);
  [DllImport("user32.dll", CharSet = CharSet.Unicode)] static extern int GetClassName(IntPtr hwnd, StringBuilder text, int max);
  [DllImport("user32.dll")] static extern bool IsWindowVisible(IntPtr hwnd);
  public static List<string[]> List() {
    var result = new List<string[]>();
    EnumWindows((hwnd, l) => {
      uint pid; uint tid = GetWindowThreadProcessId(hwnd, out pid);
      var title = new StringBuilder(256); GetWindowText(hwnd, title, 256);
      var cls = new StringBuilder(256); GetClassName(hwnd, cls, 256);
      result.Add(new string[] { pid.ToString(), tid.ToString(), IsWindowVisible(hwnd) ? "visible" : "hidden", cls.ToString(), title.ToString() });
      return true;
    }, IntPtr.Zero);
    return result;
  }
}
"@
[TskWindows]::List() | Where-Object { $tree.Contains([int]$_[0]) -or $_[3] -eq '#32770' } |
  ForEach-Object { 'pid={0} thread={1} {2} class={3} title="{4}"' -f $_[0], $_[1], $_[2], $_[3], $_[4] }

"=== native stacks of $TargetPid"
$arch = if ($env:PROCESSOR_ARCHITECTURE -eq 'ARM64') { 'arm64' } else { 'x64' }
$cdb = Get-ChildItem 'C:\Program Files (x86)\Windows Kits\10\Debuggers' -Recurse -Filter cdb.exe -ErrorAction SilentlyContinue |
  Where-Object { $_.FullName -match "\\$arch\\" } | Select-Object -First 1
if ($cdb) {
  $env:_NT_SYMBOL_PATH = "srv*$env:TEMP\tsk-symbols*https://msdl.microsoft.com/download/symbols"
  & $cdb.FullName -pv -p $TargetPid -c '~*kn 40; qd' 2>&1 | Out-String -Width 400
} else {
  'cdb.exe is not installed on this machine'
}
