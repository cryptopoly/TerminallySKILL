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
    '[ -f "$ZDOTDIR/.zshenv" ] && source "$ZDOTDIR/.zshenv"',
    'TV_USER_ZDOTDIR="${ZDOTDIR:-$HOME}"',
    'export TV_USER_ZDOTDIR',
    'ZDOTDIR="$__tv_zdotdir"',
    'unset __tv_zdotdir'
  ].join('\n') + '\n'
}

export function buildZshShellIntegrationInit(): string {
  return [
    'ZDOTDIR="${TV_USER_ZDOTDIR:-$HOME}"',
    '[ -f "$ZDOTDIR/.zshrc" ] && source "$ZDOTDIR/.zshrc"',
    "__tv_b64() { printf '%s' \"$1\" | base64 | tr -d '\\n'; }",
    "__tv_prompt_ready() { printf '\\033]7337;shell;prompt-ready;%s;%s\\007' \"$?\" \"$(__tv_b64 \"$PWD\")\"; }",
    "__tv_command_start() { printf '\\033]7337;shell;command-start;%s\\007' \"$(__tv_b64 \"$1\")\"; }",
    'precmd_functions+=(__tv_prompt_ready)',
    'preexec_functions+=(__tv_command_start)'
  ].join('\n') + '\n'
}

export function buildBashShellIntegrationInit(): string {
  return [
    '[ -f "$HOME/.bashrc" ] && source "$HOME/.bashrc"',
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
