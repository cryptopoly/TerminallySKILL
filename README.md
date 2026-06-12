<div align="center">

# TerminallySKILL ⚡

### The Professional Terminal Workspace for Engineers Who Move Fast

**Visual command builders, workflow automation, AI-powered review, SSH remoting, encrypted VNC desktop, and full terminal sessions — all in one app.**

[![Download Latest](https://img.shields.io/github/v/release/cryptopoly/TerminallySKILL?label=Download&color=14b8a6)](https://github.com/cryptopoly/TerminallySKILL/releases/latest)
[![Website](https://img.shields.io/badge/Website-terminallyskill.com-14b8a6)](https://terminallyskill.com)
[![Platform](https://img.shields.io/badge/Platforms-macOS%20%7C%20Linux%20%7C%20Windows%20(beta)-blue)](https://github.com/cryptopoly/TerminallySKILL/releases/latest)
[![MIT License](https://img.shields.io/badge/License-MIT-brightgreen)](#license)

[**🚀 Download Now**](https://github.com/cryptopoly/TerminallySKILL/releases/latest) · [**🌐 Website**](https://terminallyskill.com) · [**🐛 Report Issues**](https://github.com/cryptopoly/TerminallySKILL/issues) · [**⭐ Star This Repo**](https://github.com/cryptopoly/TerminallySKILL)

</div>

---

> **🛠️ Built with** Electron, React, TypeScript, xterm.js, and node-pty.
> Open source. Free forever. No accounts, no telemetry, no cloud dependency.

---

## What is TerminallySKILL?

TerminallySKILL is a **free, open-source desktop app** that replaces your scattered terminal windows, SSH clients, and CLI cheat-sheets with a single, powerful workspace.

### The Problem

- 🤯 **CLI fatigue** — memorising flags, syntax, and argument order for dozens of tools
- 🔄 **Context switching** — juggling terminals, SSH sessions, and scripts across windows
- 📝 **Lost knowledge** — that perfect one-liner from last month? Gone forever
- 🎯 **No visibility** — scripts run, things break, and you're left scrolling through walls of text

### The Solution

- ✅ **Visual command builder** — every CLI tool on your system, presented as a form
- ✅ **Workflow scripts** — multi-step automation with retries, approvals, and variable substitution
- ✅ **Reusable snippets** — save commands with `{{placeholders}}` for repeated use
- ✅ **AI-powered review** — safety checks, explanations, and natural-language command drafting
- ✅ **SSH + encrypted VNC** — remote terminals and full graphical desktops through SSH tunnels
- ✅ **Clipboard paste into VNC** — Ctrl+V pastes directly into remote desktops
- ✅ **Windows support (beta)** — PowerShell integration, command detection, and script execution — work in progress
- ✅ **Local-first** — your data stays on your machine, always

---

## ⚡ Quick Install

### Download Pre-Built Release (Recommended)

**[📥 Download the latest release](https://github.com/cryptopoly/TerminallySKILL/releases/latest)**

| Platform | File | Notes |
|----------|------|-------|
| 🍎 **macOS (Apple Silicon)** | `.dmg` (arm64) | Drag to Applications |
| 🍎 **macOS (Intel)** | `.dmg` (x64) | Drag to Applications |
| 🐧 **Linux (x64)** | `.AppImage` or `.deb` | AppImage needs `chmod +x` |
| 🐧 **Linux (ARM64)** | `.deb` (arm64) | `sudo dpkg -i` |
| 🪟 **Windows (x64)** | `.exe` (NSIS installer) | Run as normal user *(beta — work in progress)* |

---

## 🎯 Features

### 🔧 Visual Command Builder
Every CLI tool on your system PATH is auto-discovered and presented as a form-based builder. Select flags, fill arguments, and watch the live command preview update — no syntax memorisation required. Edit the final command directly before copying or executing.

### 📜 Workflow Scripts
Build multi-step automation scripts with commands, approval checkpoints, and notes. Inputs use `{{placeholder}}` substitution so the same script runs with different values. Export as `.tvflow` files to share with your team. Each step supports retry logic and continue-on-error control.

### ✂️ Snippets
Save reusable command templates with `{{placeholder}}` variables. Open a snippet, fill in the fields, and run — ideal for commands you use often with changing parameters.

### 💻 Terminal
Full shell sessions powered by node-pty and xterm.js:
- **Editor Prompt** — command bar with ghost suggestions, history cycling, and safe paste handling
- **Split panes** — vertical or horizontal splits with independent sessions
- **Command queue** — type while a command is running; input fires when the shell is ready
- **Output snapshots** — capture terminal output and compare any two with side-by-side diff
- **In-terminal search** — regex, case-sensitive, and whole-word matching
- **PATH fix** — detects missing commands and offers one-click binary location + shell config update

### 🌐 SSH & Remote Access
Projects can target remote SSH hosts as naturally as local directories. Configure host, user, port, and identity file — then every terminal session, script run, and workflow step executes on the remote machine transparently.

- **SSH key setup helper** — built-in guide for `ssh-keygen` + `ssh-copy-id`
- **Interactive SSH shell** — raw TTY shell on the remote host in a dedicated tab
- **Encrypted VNC remote desktop** — stream the remote graphical desktop through an SSH tunnel. No extra firewall rules — only port 22 needed
- **Clipboard integration** — Ctrl+V pastes into VNC sessions; clipboard syncs both directions

### 🤖 AI-Powered Tools
Bring your own API keys for any major provider, or run completely offline with a local model:
- **Command Review** — safety and syntax analysis before you run, with conversational follow-up
- **Command Explain** — plain-language breakdown of any command and its flags
- **AI Draft** — describe what you want in natural language; AI populates the command builder
- **Output Review** — send terminal output or saved logs to AI for analysis
- **Selection Review** — right-click any selected text in the terminal or logs for instant review

**Supported providers:** OpenAI, Anthropic, Google Gemini, Groq, Mistral, xAI (Grok), DeepSeek, OpenRouter, Together.ai, Fireworks.ai, Ollama, LM Studio, and any OpenAI-compatible endpoint.

### 📁 Projects
Organise work into named projects with their own working directory (local or SSH), environment variables, favourite commands, terminal sessions, and colour badge for instant visual identification.

### 📊 Runs & Logs
- **Unified log browser** — workflow runs and terminal logs in a single time-ordered list
- **Structured run history** — step timings, status, retry counts, and linked terminal logs
- **Full-text log search** — search across all saved output with match highlighting
- **Run comparison** — diff consecutive runs to catch regressions or confirm fixes
- **AI review from logs** — send selected text directly to AI Review

### 📂 File Browser
Browse your project directory with syntax highlighting, line numbers, and a code-editor layout for any file type. Open files directly in the terminal or send to AI for review.

### 🎨 Themes
Eight built-in themes:

| Dark | Light |
|------|-------|
| Void (teal) | Chalk (cream) |
| Ember (amber) | Latte (espresso) |
| Dusk (indigo) | Sage (olive) |
| Forest (green) | Mist (cool paper) |

### ⚙️ Settings & Customisation
- AI provider configuration with live connection testing and fallback routing
- Terminal input mode: Classic shell or Editor Prompt
- Safe paste mode — confirmation dialog before executing multi-line pastes
- Configurable log storage directory with per-project overrides
- Rich help tooltips (togglable) with descriptions and keyboard shortcuts
- Command palette (`Cmd+K` / `Ctrl+K`) for instant access to any action
- Auto-update with configurable channel

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Cmd+/` (`Ctrl+/`) | Toggle terminal panel |
| `Cmd+K` (`Ctrl+K`) | Open command palette |
| `Cmd+T` (`Ctrl+T`) | New terminal tab |
| `Cmd+W` (`Ctrl+W`) | Close active tab |
| `Cmd+D` (`Ctrl+D`) | Split terminal vertically |
| `Cmd+Shift+D` | Split terminal horizontally |
| `Cmd+]` / `Cmd+[` | Switch focus between split panes |
| `Cmd+F` (`Ctrl+F`) | Search in terminal |
| `Cmd+Shift+S` | Capture terminal snapshot |
| `Cmd+E` (`Ctrl+E`) | Toggle Editor Prompt mode |
| `Cmd+I` (`Ctrl+I`) | Help guide |
| `Cmd+S` (`Ctrl+S`) | Settings |

---

## 🛠️ Building from Source

### Prerequisites

- [Node.js](https://nodejs.org/) >= 22.12.0
- npm (included with Node.js)
- **macOS:** Xcode Command Line Tools (`xcode-select --install`)
- **Linux:** `build-essential`, `python3`, `libsecret-1-dev`
  ```bash
  sudo apt install build-essential python3 libsecret-1-dev
  ```
- **Windows:** Visual Studio Build Tools with "Desktop development with C++" workload

### Clone & Install

```bash
git clone https://github.com/cryptopoly/TerminallySKILL.git
cd TerminallySKILL
npm install
```

### Run in Development

```bash
npm run dev
```

Starts the Electron app with hot module replacement. Main process changes require a restart.

### Build

```bash
npm run build
```

Compiles into `out/`. Useful for checking TypeScript/build errors.

### Package (Create Installers)

```bash
# macOS
npm run package:mac          # Universal (x64 + arm64)
npm run package:mac:x64      # Intel only
npm run package:mac:arm64    # Apple Silicon only

# Linux
npm run package:linux        # AppImage + .deb (x64 and arm64)
npm run package:linux:x64
npm run package:linux:arm64

# Windows
npm run package:win          # NSIS installer (x64 and arm64)
npm run package:win:x64
npm run package:win:arm64
```

Output is written to `dist/`.

### Tests

```bash
npm test
```

### Automated QA

```bash
npm run test:ci            # i18n check + unit/integration tests + production build
npm run test:runtime-baseline # static runtime/dependency baseline check
npm run test:e2e           # build + Playwright Electron E2E smoke tests
npm run test:e2e:ssh-docker # Docker-backed real OpenSSH handshake E2E
npm run test:package:mac:arm64 # build + launch packaged macOS arm64 app smoke
npm run test:audit:runtime # runtime dependency audit
npm run test:audit:all     # full dependency audit, including dev/build tooling
npm run test:ssh-fixture:create # create a fake ssh binary for future E2E runs
```

The broader automation roadmap is documented in [`docs/TESTING_PLAN.md`](docs/TESTING_PLAN.md).

---

## 🐛 Troubleshooting

### macOS: "App is damaged and can't be opened"
```bash
xattr -dr com.apple.quarantine /Applications/TerminallySKILL.app
```

### Linux: AppImage won't run
```bash
chmod +x TerminallySKILL-*.AppImage
./TerminallySKILL-*.AppImage
```

### Windows: SmartScreen warning
Click **More info → Run anyway**.

---

## 🏗️ Tech Stack

| Layer | Technology |
|-------|------------|
| Desktop shell | Electron 42 |
| UI framework | React 18 |
| Language | TypeScript (end-to-end) |
| Styling | Tailwind CSS 3 + CSS custom properties |
| State management | Zustand |
| Terminal emulator | xterm.js (fit, search, serialise, web-links addons) |
| PTY / shell | node-pty |
| VNC client | @novnc/novnc |
| WebSocket proxy | ws |
| Fuzzy search | Fuse.js |
| Syntax highlighting | highlight.js |
| Panel layout | react-resizable-panels |
| Build & HMR | Vite via electron-vite |
| Packaging | electron-builder |

---

## 📁 Project Structure

```
src/
  main/           # Electron main process — IPC handlers, PTY, VNC tunnel, AI, file ops
  preload/        # Context bridge (electronAPI surface exposed to renderer)
  renderer/       # React application
    src/
      components/ # UI — command builder, terminal, scripts, VNC panel, etc.
      store/      # Zustand stores
      lib/        # Utilities and helpers
  shared/         # Types and schemas shared between main and renderer
build/            # App icons and platform assets
scripts/          # Build and packaging helpers
```

---

## 💻 System Requirements

| Platform | Minimum Version |
|----------|----------------|
| **macOS** | 12 Monterey or later (M1/M2/M3 or Intel) |
| **Linux** | glibc 2.28+ (Ubuntu 20.04+ / Debian 10+) |
| **Windows** | Windows 10 (1903) or later, x64 *(beta — some features may be limited)* |

---

## ❤️ Support TerminallySKILL

TerminallySKILL is free, open source, and built independently. If it saves you time or makes your workflow better, consider supporting development:

- **⭐ [Star this repo](https://github.com/cryptopoly/TerminallySKILL)** — helps with visibility and discovery
- **☕ [Buy Me a Coffee](https://buymeacoffee.com/cryptoraptor)** — quick one-time support
- **💜 [PayPal Donate](https://www.paypal.com/donate/?hosted_button_id=5VJ5KLNBQ9LRN)** — one-time or recurring
- **🌐 [Support via Website](https://terminallyskill.com/#support)** — more options
- **🐛 [Report issues](https://github.com/cryptopoly/TerminallySKILL/issues)** — bug reports and feature requests welcome
- **📢 [Share on Twitter](https://twitter.com/intent/tweet?text=TerminallySKILL%20%E2%80%94%20a%20professional%20terminal%20workspace%20with%20visual%20command%20builders%2C%20workflow%20scripts%2C%20AI%20review%2C%20SSH%20%2B%20VNC%20remoting.%20Free%20%26%20open%20source.%20%E2%9A%A1&url=https://terminallyskill.com)** — spread the word

---

## 📜 License

This project is licensed under the [MIT License](LICENSE).

---

<div align="center">

**[🚀 Download Now](https://github.com/cryptopoly/TerminallySKILL/releases/latest)** · **[🌐 Website](https://terminallyskill.com)** · **[⭐ Star on GitHub](https://github.com/cryptopoly/TerminallySKILL)**

Made with ⚡ by [cryptopoly](https://github.com/cryptopoly)

</div>
