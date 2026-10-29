# Local OpenSSH end-to-end test (no Docker)

Branch: `test/local-ssh-e2e`. Files: `tests/e2e/local-openssh-fixture.mjs`, `tests/e2e/ssh-local.spec.mjs`, npm script `test:e2e:ssh-local`. The Docker spec is untouched.

## How to run

```
npm run test:e2e:ssh-local        # builds, then RUN_LOCAL_SSH_E2E=1 playwright test tests/e2e/ssh-local.spec.mjs
```

Without `RUN_LOCAL_SSH_E2E=1` the spec skips. If `/usr/sbin/sshd` is missing or will not start, it skips with the reason. Needs `/usr/sbin/sshd`, `ssh`, `ssh-keygen`, `ssh-keyscan` (all stock on macOS). Takes about 7 seconds.

## What the fixture does

Starts `/usr/sbin/sshd -D -e -f <cfg>` as the current user on a random free `127.0.0.1` port. Host key, client key, a second "wrong" key, `authorized_keys`, pid file and config all live in the Playwright output dir. Public-key auth only, `UsePAM no`, `AllowUsers <current user>`. `stop()` signals only the child it spawned. It never touches `~/.ssh`, system sshd config, Remote Login, or any other process.

## What each test proves

1. `testWorkspaceTarget` against the real sshd returns `ok` and the remote cwd (app's `ssh -i ... BatchMode` invocation really authenticates).
2. A key the server does not know gives the app's "SSH authentication failed" message (real `Permission denied (publickey)`).
3. An unknown host key gives "SSH host key verification failed": the app does not silently trust new hosts (BatchMode plus default StrictHostKeyChecking). Test 1 is the positive control (same host, key trusted).
4. The full flow: create an SSH project through the IPC the renderer uses, reload, click the "SSH shell" (server icon) button in the terminal bar, wait for the remote prompt, then in the real xterm: `echo remote-ok-$((20+22))` (42 means the remote shell evaluated it), `hostname`, a 3000-character command line, a 20000-line output burst, then `exit` twice. Asserts no renderer crash or page error, the ssh session is the one that carried the output, and the PTY exits with code 0.

## Gotchas found (important for future edits)

- **OpenSSH ignores `$HOME`** on macOS (it uses the passwd home), so `HOME=<tmp>` does not isolate `~/.ssh/known_hosts`. Without protection the app's interactive `ssh` would read, and on a "yes" answer write, the developer's real known_hosts. The spec puts an `ssh` wrapper first on PATH that execs `/usr/bin/ssh -F /dev/null -o UserKnownHostsFile=<tmp> -o GlobalKnownHostsFile=/dev/null -o IdentityAgent=none -o IdentitiesOnly=yes` plus the app's own arguments, and logs those arguments. The app's argument construction is still what is tested.
- **The terminal PATH is rebuilt from a login+interactive shell probe** (`getAllScanDirs`), and macOS `path_helper` puts `/usr/bin` first, so a PATH prefix on Electron alone is not enough for the PTY. The spec points `ZDOTDIR` at a temp dir whose `.zshrc`/`.zprofile` prepend the wrapper dir. The developer's real zsh rc files are not read. Bash users would need an equivalent; on Linux a plain PATH prefix is enough.
- **Do not override `HOME` for the Electron process on macOS.** With `HOME=<tmp>` the app window closed but the Electron main process stayed alive for more than 40 seconds after `app.quit()` (reproduced with a bare launch plus HOME). The Docker spec does override HOME; if it is ever run on macOS it may hit this. The spec's `closeApp()` also falls back to SIGKILL on the Electron process it launched if quit takes over 8 seconds.
- **Closing the window while a shell is starting or running a command opens a blocking native confirmation dialog** (`getActiveSessionCountForWindow`, `shellState === 'executing'`). Playwright cannot click it, so `closeApp()` waits for an idle prompt first. Possible app UX point: a freshly opened shell that has not shown its first prompt counts as active (not verified beyond this test).

## Limits: what a real VM or remote host would still add

- A different OS and OpenSSH build on the server (this is the host's own OpenSSH 10.x talking to itself).
- Real network latency, packet loss, reconnects, slow DNS, ssh-agent and jump hosts.
- sshd running as root with privilege separation, PAM, password and keyboard-interactive auth, `StrictModes yes`, a different remote login shell and `$SHELL`.
- A remote cwd that differs from the local filesystem (here the "remote" dir is a temp dir on this Mac).
- VNC/port-forward sessions (`-N` tunnels) are not covered.
- Electron version: nothing here depends on it, so the spec can be run unchanged on the Electron-upgrade branch. The current lockfile resolved Electron 42.4.0 in this worktree.
