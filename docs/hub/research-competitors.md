---
title: Competitor research
order: 6
summary: What rivals offer and what we could add next.
---
# Competitor research (2026-10-28)

Method: web searches only; several sources are secondary reviews. Items marked (unverified) were not confirmed from a primary source. I did not audit the TerminallySKILL codebase beyond the README, so "lacks" means "not in README".

## 1. Landscape
The market has split three ways. Warp has moved to "agentic development environment" with cloud agents (Oz), shared Warp Drive workflows and MCP, and open-sourced its client in April 2026 (secondary sources). The agent-era entrants (cmux on Ghostty, Wave) compete on running several AI agents in parallel with "needs attention" signals. Classic terminals (Ghostty, WezTerm, iTerm2, Tabby) compete on speed and config, and users still bolt on session restore via plugins. SSH clients (Termius) win on vaults, SFTP, tunnels and multi-host snippets. Fig's autocomplete lives on through Kiro CLI and inshellisense via the Fig spec format. The loudest recurring complaint is trust: telemetry, accounts and network calls from a terminal. TerminallySKILL's "local-first, no telemetry" position is a real differentiator.

## 2. Feature table
| Feature | Who has it | Evidence | Fit | Effort |
|---|---|---|---|---|
| Parallel-agent attention signals (unread ring, jump to unread, long-command-finished notify) | cmux | https://cmux.com/agents | High | S |
| Command blocks (select/copy one command's output, rerun, share) | Warp | https://aiproductivity.ai/guides/warp-terminal-guide/ | High | M |
| Team-shared workflows / prompts (Warp Drive) | Warp | https://www.warp.dev/newsroom/2026/3/31/introducing-the-warp-terminal-with-ai-superpowers | Med (file/git sharing, no cloud) | S |
| Scheduled / triggered runs (cron, webhook) | Warp Oz | https://productbuilder.net/it/learn/warp (secondary) | High | M |
| Run snippet/workflow on multiple SSH hosts | Termius | https://www.everydev.ai/tools/termius | High | M |
| SFTP pane and port-forward UI, jump hosts | Termius | https://www.techrepublic.com/article/how-to-use-termius-ssh/ | Med (SFTP presence in ours unverified) | M |
| Searchable, synced shell history across machines | Atuin | https://atuin.sh (encryption claim from secondary sources) | Med | M |
| Spec-driven completions (Fig spec) | Kiro CLI, inshellisense | https://dev.to/kirodotdev/understanding-the-differences-kiro-ide-kiro-cli-and-amazon-q-developer-2hib | High (feeds the command builder) | M |
| Network-activity log / telemetry transparency | Warp (added after backlash) | https://hn.svelte.dev/item/47945823 | High (cheap trust signal) | S |
| Widgets/blocks: process viewer, web, preview panes; quake hotkey | Wave | https://docs.waveterm.dev/releasenotes | Low-Med | M |

## 3. Ranked recommendations
1. **Agent/long-run attention layer (FLAGSHIP).**
   - What: per-tab status (running, finished, failed, waiting for input), a dock/tab badge, an OS notification when a command or workflow step finishes, and "jump to next unread".
   - Why users want it: people now run several Claude Code/Codex sessions plus builds and lose track of which one needs them. This is cmux's main selling point.
   - Fit: reuses the existing command queue, Runs & Logs status, and workflow approval checkpoints (an approval waiting is already an "attention" event). The failed-command "Explain & fix" button becomes the action on a failed badge.
   - Smallest 0.9.103 version: OS notification plus tab badge when a command exceeds N seconds and finishes (exit code shown), and when a workflow step is awaiting approval. One setting to toggle. No new data model.
   - Why flagship: small, visibly new, matches what the 2026 market is racing on, and builds on features we already have.
2. **Multi-host run.** Run a workflow or snippet across a chosen set of SSH projects, with a per-host result table in Runs & Logs. Smallest version: sequential run, per-host pass/fail summary. Fits SSH projects plus `.tvflow` retries.
3. **Command blocks lite.** Detect prompt boundaries (shell integration is already present for zsh) and add "copy output", "rerun", and "Explain & fix" per command. Smallest version: copy-last-output and rerun-last command in the context menu.
4. **Scheduled workflows.** Cron-like trigger for a `.tvflow` while the app is open, with a notification on failure. Smallest version: a single "run every N minutes/at time" field per workflow. Be honest that it only runs while the app is open.
5. **Offline-verifiable privacy panel.** A Settings view that states "no network calls except your chosen AI provider and update check", and logs outbound requests. Smallest version: static statement plus the update-check and AI request list. Turns the trust complaint into marketing.
6. **Completions feeding the command builder.** Import Fig-spec JSON as an alternative to `--help` parsing for tools whose help output parses badly. Smallest version: read local spec files for a handful of tools. Needs checking that the spec licence permits bundling (unverified).

## 4. Do NOT copy
- Mandatory accounts, cloud-only features, or default-on telemetry. Warp's history here caused repeated backlash, including a bug where telemetry re-enabled after restart (https://hn.svelte.dev/item/47945823).
- Marketing as an "agentic environment" with credit/subscription metering. Our "free, local" stance is the draw.
- Cloud agent orchestration (Oz-style). It needs servers and contradicts local-first.
- Paywalling basics such as tunnels or vault sync (Termius tiering is confusing and sources conflict).
- Plugin-only session restore (WezTerm users rely on fragile third-party plugins, https://mwop.net/blog/2024-10-21-wezterm-resurrect.html). If we add restore, build it in, but it is not in the top six.

## Gaps
Not verified: Ghostty, iTerm2, Tabby, Hyper, Zed/VS Code issue trackers (searches returned nothing usable); Nushell and tmux-based tools not researched; Reddit not reached; Atuin docs fetch failed (redirect). Wave's exact 2026 release dates unclear.
