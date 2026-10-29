---
title: Competitor research
order: 6
summary: What rivals offer and what we could add next.
---
# Competitor research

Two passes so far. The newest is first; the first pass (2026-10-28) follows unchanged. Ideas that came out of this are numbered in [ideas](ideas.md).

## Update 2026-10-29: second pass

Method: web searches and a few page fetches on 2026-10-29. Each claim carries its source. **(unverified)** means a secondary source only, a mirror, or conflicting sources. Not re-checked from the first pass: cmux pricing, Wave's official notes.

### What changed in 2026

- **Agents moved into the terminal, and "which tab needs me" became the feature everyone races on.** iTerm2 3.7 (2026-09-10) added Claude Code session status with tab dots, tab groups, a session archive (save and restore scrollback), redaction in its screenshot tool and an "orchestration" AI chat that sees all sessions ([AlternativeTo](https://alternativeto.net/news/2026/9/iterm2-3-7-released-with-ios-companion-app-claude-code-integration-tab-groups-and-more/)). Zed added terminal threads for claude, codex and amp with attention notifications on 2026-05-20 ([Zed blog](https://zed.dev/blog/terminal-threads)). cmux rings a pane on OSC 9, 99 or 777 and jumps to the newest unread with Cmd+Shift+U ([cmux docs](https://cmux.dev/docs/notifications)).
- **A standard for program status arrived.** Mitchell Hashimoto proposed the OSC 7501 Program Status Protocol on 2026-10-06: states idle, working, blocked, done and error, `key=value` pairs, base64 message; implemented in libghostty and in proof-of-concept Claude Code, Codex, Terraform and Homebrew integrations ([mitchellh.com](https://mitchellh.com/writing/program-status-osc7501); spec at [superlogical.com](https://www.superlogical.com/rex/docs/build/program-status), not read). Claude Code's own docs say it reports status to terminals that implement OSC 7501 from v2.1.295, with nothing to turn on, and that it sends desktop notifications by default only in Ghostty, Kitty and iTerm2; other terminals get nothing unless the user sets `preferredNotifChannel` or a hook ([Claude Code docs](https://code.claude.com/docs/en/terminal-config)). **How a terminal advertises OSC 7501 support is not covered in what was read (unverified).**
- **Classic terminals caught up on basics.** Ghostty 1.3 (2026-03-09): scrollback search, native scrollbars, notifications when long commands finish, click-to-move-cursor via OSC 133 ([Ghostty release notes](https://ghostty.org/docs/install/release-notes/1-3-0), [Linuxiac](https://linuxiac.com/ghostty-1-3-terminal-emulator-released-with-native-scrollbars/)). Our attention layer is no longer unique on its own; agent awareness is the next step.
- **Warp open-sourced its client** under AGPL on 2026-04-28, with the cloud and agent parts (Oz) still proprietary ([Warp press release](https://www.warp.dev/newsroom/2026/4/28/warp-open-sources-its-agentic-development-environment), [Help Net Security](https://www.helpnetsecurity.com/2026/04/30/warp-open-source-client/)). Pricing moved to a single $20/month "Build" plan with AI credits (2025-11) ([Tessl](https://tessl.io/blog/warp-joins-the-pricing-pivot-sweeping-ai-developer-tools); exact credit terms conflict between sources, **unverified**).
- **Fig's line ended in a closed product.** Amazon Q Developer CLI became Kiro CLI on 2025-12-15 ([AWS docs](https://docs.aws.amazon.com/pt_br/amazonq/latest/qdeveloper-ug/upgrade-to-kiro.html)); the open Q CLI repo gets security fixes only ([dev.co listing](https://dev.co/ai/mcp/amazon-q-developer-cli), **unverified**). The completion specs in `withfig/autocomplete` are MIT ([GitHub](https://github.com/withfig/autocomplete)).
- **Hyper is effectively dormant:** last push 2024-08-14 per an index ([ecosyste.ms](https://awesome.ecosyste.ms/projects/github.com%2Fvercel%2Fhyper)); a fork claims development ended in 2023 ([GitHub issue](https://github.com/vercel/hyper/issues/8203), fork's own claim).

### Per competitor: praise, complaints, lesson for us

| Product | Praised for | Complaints | Lesson for TerminallySKILL |
|---|---|---|---|
| Warp | Blocks, workflows with `{{argument}}` parameters and defaults ([docs](https://docs.warp.dev/knowledge-and-collaboration/warp-drive/workflows/)); repo-stored YAML workflows in `.warp/workflows` ([docs](https://docs.warp.dev/terminal/entry/yaml-workflows)); Secret Redaction, regex-based, off by default, redacts before sending to LLMs ([docs](https://docs.warp.dev/features/secret-redaction)) | Forced sign-in and telemetry on by default (2024–25 reports, may be out of date) ([It's FOSS](https://itsfoss.com/news/warp-terminal-no-login/)); nagging to buy credits covering terminal output ([issue mirror](https://upd.dev/warpdotdev/warp/issues/8065), **unverified**) | Our `{{name}}` input syntax matches Warp's, so a Warp workflow importer is cheap (idea 9). Secret masking with local AI is a stronger privacy story than theirs (idea 15). |
| iTerm2 | Deep feature set; 3.7 Claude Code status dots, session archive ([AlternativeTo](https://alternativeto.net/news/2026/9/iterm2-3-7-released-with-ios-companion-app-claude-code-integration-tab-groups-and-more/)) | 2024 backlash against built-in AI features ([HN thread](https://hn.svelte.dev/item/40458135)); 3.7.6 changed so API keys go only to their own provider ([releasebot](https://releasebot.io/updates/iterm2), **unverified**) | Keep AI opt-in and visible in the Privacy tab; agent status dots are now table stakes on macOS (idea 14). |
| Ghostty | Speed, native feel, 1.3 search and notifications ([release notes](https://ghostty.org/docs/install/release-notes/1-3-0)) | Few complaints found; no workflows, SSH projects or builder | We cannot win on raw speed; win on workflows, SSH projects and agent awareness. |
| Wave | All-in-one widgets; v0.14.5 (2026-04-17) process viewer for local and remote, quake mode, drag files to paste paths ([softantenna](https://softantenna.com/updates/20260417), **secondary**) | Not researched this pass | A remote process view is attractive but large; not proposed. |
| Tabby | SSH with port forwarding, jump hosts, SFTP and Zmodem, serial ([x-cmd](https://x-cmd.com/install/tabby/)) | "Heavy" Electron app, high memory ([blog](https://lastredoubt.substack.com/p/updates-and-goings-on-and-tabby)); SFTP bugs (no folder download, permissions after `sudo -iu`) ([issue list](https://opencollective.ecosyste.ms/collectives/tabby/issues), dates relative, **unverified**) | We are Electron too: keep start time and memory in check (idea 12). Do port-forward before SFTP (idea 11). |
| Termius | SSH, SFTP and port forwarding free; clear tunnel UI; run a snippet on several hosts with saved target sets ([docs](https://docs.termius.com/terminal/snippets), [termai.sh](https://termai.sh/blog/termius-free-vs-paid)) | Subscription seen as overpriced ([JustUseApp](https://justuseapp.com/en/app/549039908/termius-terminal-ssh-client/reviews)); SFTP slow ([G2](https://www.g2.com/products/termius)); sync needs an account and Pro (~$10/month annual, [itechguides](https://www.itechguides.com/best/ssh-clients/termius/), **secondary**) | Multi-host run without an account is our answer (idea 2); save target host sets per workflow. |
| WezTerm, Kitty | Config power, multiplexing | No 2026 primary sources found (**gap**) | No new lesson. |
| Fig / Q CLI / Kiro CLI | Spec-driven completions | Now closed source and account-based (Kiro) | Open MIT specs are free to reuse in the builder (idea 4). |
| Zed terminal | Terminal threads for agents; per-host network allowlist for agent terminal commands ([Zed release notes](https://zed.dev/releases/preview/1.8.0), version labels inconsistent, **unverified**) | Not researched | Network allowlist idea echoes our Privacy tab; banked thought, not proposed. |
| VS Code terminal | Shell integration with exit-code gutter marks, sticky scroll, suggest ([docs](https://code.visualstudio.com/docs/terminal/shell-integration)) | Not researched | Gutter marks per command are the expected baseline for idea 1. |
| Claude Code / Codex (agents) | OSC 9 notifications, OSC 7501 status, hooks ([Claude Code docs](https://code.claude.com/docs/en/terminal-config); Codex OSC 9 per [a third-party guide](https://codex.danielvaughan.com/2026/04/13/codex-cli-notification-pipeline-osc9-hooks-alerts/), **secondary**) | Generic "Claude is waiting" alerts without context (cmux README, via [cmux docs](https://cmux.dev/docs/notifications)) | Speak these sequences so agents in our tabs alert natively (idea 14). |
| Atuin | Local history search, optional end-to-end encrypted sync, self-hostable; Atuin Desktop runbooks, local-first ([atuin.sh](https://atuin.sh)) | 2026 release notes not found | Shell history is a big surface (idea 10); runbooks from Markdown are a cheaper win (idea 18). |
| Runme | Markdown files as runnable runbooks ([b-nova](https://b-nova.com/en/home/content/turn-your-boring-docs-into-interactive-terminals-with-runme/)) | 2026 status unknown | Idea 18. |

### Common complaints across the market (what users punish)

1. **Accounts and telemetry** in a terminal (Warp history; Kiro needs an account). Our "No telemetry. No analytics. No account." line still differentiates.
2. **Subscriptions and credits** for basics (Termius sync, Warp credits).
3. **Electron weight** (Tabby). We share the risk.
4. **AI pushed on users** (iTerm2 3.5). Keep AI opt-in, with local models (Ollama, LM Studio) already supported in `main/ai-manager.ts`.
5. **Slow or buggy SFTP** (Termius, Tabby). Do not rush an SFTP pane.

### What one developer can do in one to two weeks that looks impressive

Ranked in [ideas](ideas.md#shortlist-a-feature-for-09103-about-a-week): idea 14 (agent-aware attention, about 3–4 days with the jump shortcut), idea 15 (secret masking, about a week), idea 16 (save recent commands as a workflow), idea 18 (Markdown runbooks), idea 17 (paste a command into the builder).

### Gaps in this pass

OSC 7501 feature detection and the formal spec not read; Warp's current telemetry default not confirmed for 2026; WezTerm and Kitty 2026 changes not found; Reddit and Hacker News 2026 threads not reached; no memory measurements of any app.

## First pass (2026-10-28)

Method: web searches only; several sources are secondary reviews. Items marked (unverified) were not confirmed from a primary source. I did not audit the TerminallySKILL codebase beyond the README, so "lacks" means "not in README".

### 1. Landscape
The market has split three ways. Warp has moved to "agentic development environment" with cloud agents (Oz), shared Warp Drive workflows and MCP, and open-sourced its client in April 2026 (secondary sources). The agent-era entrants (cmux on Ghostty, Wave) compete on running several AI agents in parallel with "needs attention" signals. Classic terminals (Ghostty, WezTerm, iTerm2, Tabby) compete on speed and config, and users still bolt on session restore via plugins. SSH clients (Termius) win on vaults, SFTP, tunnels and multi-host snippets. Fig's autocomplete lives on through Kiro CLI and inshellisense via the Fig spec format. The loudest recurring complaint is trust: telemetry, accounts and network calls from a terminal. TerminallySKILL's "local-first, no telemetry" position is a real differentiator.

### 2. Feature table
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

### 3. Ranked recommendations
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

### 4. Do NOT copy
- Mandatory accounts, cloud-only features, or default-on telemetry. Warp's history here caused repeated backlash, including a bug where telemetry re-enabled after restart (https://hn.svelte.dev/item/47945823).
- Marketing as an "agentic environment" with credit/subscription metering. Our "free, local" stance is the draw.
- Cloud agent orchestration (Oz-style). It needs servers and contradicts local-first.
- Paywalling basics such as tunnels or vault sync (Termius tiering is confusing and sources conflict).
- Plugin-only session restore (WezTerm users rely on fragile third-party plugins, https://mwop.net/blog/2024-10-21-wezterm-resurrect.html). If we add restore, build it in, but it is not in the top six.

### Gaps
Not verified: Ghostty, iTerm2, Tabby, Hyper, Zed/VS Code issue trackers (searches returned nothing usable); Nushell and tmux-based tools not researched; Reddit not reached; Atuin docs fetch failed (redirect). Wave's exact 2026 release dates unclear.
