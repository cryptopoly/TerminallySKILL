/**
 * Temp .zshenv: forwards to the user's real .zshenv. If that file moves ZDOTDIR
 * (XDG layouts), remember the new location in TV_USER_ZDOTDIR and point zsh back at
 * the temp dir so our integration .zshrc is still the one that gets read.
 */
export function buildZshEnvForward(tmpDir: string): string {
  const quoted = `'${tmpDir.replace(/'/g, `'\\''`)}'`
  return [
    '__tv_zdotdir=' + quoted,
    'ZDOTDIR="${TV_USER_ZDOTDIR:-$HOME}"',
    // A stale TV_USER_ZDOTDIR can point back at this temp dir; never source ourselves
    '[ "$ZDOTDIR" = "$__tv_zdotdir" ] && ZDOTDIR="$HOME"',
    '[ -f "$ZDOTDIR/.zshenv" ] && source "$ZDOTDIR/.zshenv"',
    'TV_USER_ZDOTDIR="${ZDOTDIR:-$HOME}"',
    'export TV_USER_ZDOTDIR',
    'ZDOTDIR="$__tv_zdotdir"',
    'unset __tv_zdotdir'
  ].join('\n') + '\n'
}

export function buildZshShellIntegrationInit(): string {
  return [
    '__tv_zdotdir="$ZDOTDIR"',
    'ZDOTDIR="${TV_USER_ZDOTDIR:-$HOME}"',
    '[ "$ZDOTDIR" = "$__tv_zdotdir" ] && ZDOTDIR="$HOME"',
    // /etc/zshrc already ran with ZDOTDIR on the temp dir, which would keep history in a file deleted with the tab
    '[[ "$HISTFILE" == "$__tv_zdotdir"/* ]] && HISTFILE="$ZDOTDIR/.zsh_history"',
    '[ -f "$ZDOTDIR/.zshrc" ] && source "$ZDOTDIR/.zshrc"',
    // Workflow step markers are typed into the shell; keep them out of up-arrow history
    '__tv_history_filter() { [[ "$1" != *"]7337;workflow-step;"* ]]; }',
    'zshaddhistory_functions+=(__tv_history_filter)',
    "__tv_b64() { printf '%s' \"$1\" | base64 | tr -d '\\n'; }",
    "__tv_prompt_ready() { printf '\\033]7337;shell;prompt-ready;%s;%s\\007' \"$?\" \"$(__tv_b64 \"$PWD\")\"; }",
    "__tv_command_start() { printf '\\033]7337;shell;command-start;%s\\007' \"$(__tv_b64 \"$1\")\"; }",
    'unset __tv_zdotdir',
    'precmd_functions+=(__tv_prompt_ready)',
    'preexec_functions+=(__tv_command_start)'
  ].join('\n') + '\n'
}

export function buildBashShellIntegrationInit(): string {
  return [
    '[ -f "$HOME/.bashrc" ] && source "$HOME/.bashrc"',
    // Workflow step markers are typed into the shell; keep them out of up-arrow history
    'HISTIGNORE="${HISTIGNORE:+$HISTIGNORE:}*]7337;workflow-step;*"',
    "__tv_b64() { printf '%s' \"$1\" | base64 | tr -d '\\n'; }",
    "__tv_prompt_ready() { printf '\\033]7337;shell;prompt-ready;%s;%s\\007' \"$__tv_last_exit\" \"$(__tv_b64 \"$PWD\")\"; }",
    "__tv_command_start() { printf '\\033]7337;shell;command-start;%s\\007' \"$(__tv_b64 \"$1\")\"; }",
    '__tv_prompt_state=1',
    '__tv_command_started=0',
    '__tv_last_exit=0',
    '__tv_prompt_command_is_array=0',
    '__tv_original_prompt_command=""',
    'if declare -p PROMPT_COMMAND >/dev/null 2>&1; then',
    '  case "$(declare -p PROMPT_COMMAND 2>/dev/null)" in',
    '    "declare -a"*)',
    '      __tv_prompt_command_is_array=1',
    '      __tv_original_prompt_command_array=("${PROMPT_COMMAND[@]}")',
    '      ;;',
    '    *)',
    '      __tv_original_prompt_command="${PROMPT_COMMAND-}"',
    '      ;;',
    '  esac',
    'fi',
    '__tv_run_original_prompt_command() {',
    '  if [ "${__tv_prompt_command_is_array:-0}" -eq 1 ]; then',
    '    local command',
    '    for command in "${__tv_original_prompt_command_array[@]}"; do',
    '      eval "$command"',
    '    done',
    '    return',
    '  fi',
    '  if [ -n "$__tv_original_prompt_command" ]; then',
    '    eval "$__tv_original_prompt_command"',
    '  fi',
    '}',
    '__tv_prompt_command() {',
    '  __tv_last_exit=$?',
    '  __tv_prompt_state=1',
    '  __tv_command_started=0',
    '  __tv_prompt_ready',
    '  __tv_run_original_prompt_command',
    '  __tv_prompt_state=0',
    '}',
    '__tv_preexec_inner() {',
    '  if [ -n "$COMP_LINE" ]; then',
    '    return',
    '  fi',
    '  if [ "${__tv_prompt_state:-0}" -eq 1 ]; then',
    '    return',
    '  fi',
    '  if [ "${__tv_command_started:-0}" -eq 1 ]; then',
    '    return',
    '  fi',
    '  __tv_command_started=1',
    '  __tv_command_start "$BASH_COMMAND"',
    '}',
    '__tv_preexec() {',
    '  __tv_preexec_inner',
    '  if [ -n "$__tv_prev_debug_trap" ]; then',
    '    eval "$__tv_prev_debug_trap"',
    '  fi',
    '}',
    // Keep any DEBUG trap the user already installed (bash-preexec, atuin) and chain to it
    '__tv_capture_debug_trap() { eval "set -- $(trap -p DEBUG)"; __tv_prev_debug_trap="${3-}"; }',
    '__tv_capture_debug_trap',
    "trap '__tv_preexec' DEBUG",
    'PROMPT_COMMAND="__tv_prompt_command"'
  ].join('\n') + '\n'
}

/**
 * Runs after the user's profile, so it wraps whatever prompt the profile set (oh-my-posh, starship).
 * Windows PowerShell 5.1 has no `e escape, hence [char]27. Markers go straight to the console so the
 * pipeline and formatting never see them.
 */
export function buildPowerShellShellIntegrationInit(): string {
  return [
    '$global:__TvState = @{ Prompt = $function:prompt; LastError = $null; History = $null; ReadLine = $null; Reading = $false }',
    'if ($global:Error.Count) { $global:__TvState.LastError = $global:Error[0] }',
    'function global:__TvMarker([string]$Payload) { [Console]::Write([string][char]27 + "]7337;shell;" + $Payload + [char]7) }',
    'function global:__TvB64([string]$Text) { [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($Text)) }',
    'function global:prompt {',
    // Anything we run resets $?, so it has to be read first
    '  $ok = $?',
    '  $native = $global:LASTEXITCODE',
    '  Set-StrictMode -Off',
    // PSReadLine redraws the prompt mid-edit (Ctrl+L, transient prompts on Enter); only a new prompt is an event
    '  if (-not $global:__TvState.Reading) {',
    '    $lastError = $null',
    '    if ($global:Error.Count) { $lastError = $global:Error[0] }',
    '    $code = 0',
    '    if (-not $ok) {',
    '      $code = 1',
    // $LASTEXITCODE keeps its value through later cmdlet failures: use it only when no PowerShell error came since
    '      if ($native -is [int] -and $native -ne 0 -and [object]::ReferenceEquals($lastError, $global:__TvState.LastError)) { $code = $native }',
    '    }',
    '    $global:__TvState.LastError = $lastError',
    // Registry, Env: and other provider locations are not folders; report the FileSystem location instead
    '    __TvMarker ("prompt-ready;" + $code + ";" + (__TvB64 (Get-Location -PSProvider FileSystem).ProviderPath))',
    '  }',
    // Give $? back to a prompt that shows the last status (starship, oh-my-posh)
    '  if (-not $ok) { Write-Error "failure" -ErrorAction Ignore }',
    '  & $global:__TvState.Prompt',
    // A prompt that runs git or another program must not change what the next line sees
    '  $global:LASTEXITCODE = $native',
    '}',
    // Without PSReadLine there is no hook for the submitted line; prompt-ready still works
    'if (Get-Module PSReadLine) {',
    '  $global:__TvState.ReadLine = $function:PSConsoleHostReadLine',
    // Returns once a line is accepted, whichever key accepted it and after the newline is drawn, so the
    // marker lands on the line where the output starts. An Enter key handler fires on incomplete lines too.
    '  function global:PSConsoleHostReadLine {',
    '    $ok = $?',
    '    $global:__TvState.Reading = $true',
    // PSReadLine 2.1+ reads $? itself to colour the prompt after a failure
    '    if (-not $ok) { Write-Error "failure" -ErrorAction Ignore }',
    '    try { $line = & $global:__TvState.ReadLine } finally { $global:__TvState.Reading = $false }',
    '    if (-not [string]::IsNullOrWhiteSpace($line)) { __TvMarker ("command-start;" + (__TvB64 $line)) }',
    '    $line',
    '  }',
    '  $global:__TvState.History = (Get-PSReadLineOption).AddToHistoryHandler',
    // Workflow step markers are typed into the shell; keep them out of up-arrow history
    '  Set-PSReadLineOption -AddToHistoryHandler {',
    '    param([string]$Line)',
    '    if ($Line.Contains("]7337;workflow-step;")) { return $false }',
    '    if ($global:__TvState.History) { return $global:__TvState.History.Invoke($Line) }',
    '    $true',
    '  }',
    '}'
  ].join('\n') + '\n'
}

/**
 * The script is read as text rather than run as a .ps1 file, so the execution policy (Restricted by
 * default on Windows PowerShell) neither blocks it nor has to be loosened for the user's session.
 * PowerShell also treats curly single quotes as quotes, so they are doubled like the plain one.
 */
export function buildPowerShellIntegrationArgs(scriptPath: string): string[] {
  const quoted = `'${scriptPath.replace(/['\u2018\u2019\u201a\u201b]/g, '$&$&')}'`
  return ['-NoLogo', '-NoExit', '-Command', `. ([ScriptBlock]::Create([IO.File]::ReadAllText(${quoted})))`]
}
