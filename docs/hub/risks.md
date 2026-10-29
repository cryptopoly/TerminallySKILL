---
title: Risks and assumptions
order: 8
summary: What we assume, what could go wrong, and what we do about it.
---
# Assumptions and risks

Review at the end of every release.

## Assumptions

- Electron 42.x keeps receiving security patches. *If wrong:* move to the next supported Electron major.
- GitHub release feeds stay the update channel. *If wrong:* switch the generic update URL.

## Risks

| Risk | Likelihood | Impact | Mitigation | Status |
|---|---|---|---|---|
| Vulnerable or outdated dependency ships unnoticed | medium | P1 | Monthly review (see [backlog](backlog.md)), `npm audit` in the release gate | open |
| Machine-made translations contain wrong wording | medium | P2 | Native-speaker review, per-language checks in CI | open |
| Native `node-pty` breaks in a packaged build | low | P1 | Packaged smoke test `npm run test:package:mac:arm64` before every release | mitigated |
| CI runner image changes break signing or builds | medium | P2 | Pin runner images; read failed logs before re-running | mitigated |
| Telemetry or account features creep in | low | P1 | Product rule: none; see [decisions](decisions.md) | open |
| Alerts feel noisy or missed | medium | P2 | 15 s default threshold, no alert while watching, one switch to turn off; collect feedback after release | open |
| Scheduled run misfires (wrong tab busy, missed while app closed) | medium | P2 | Skips overlapping runs, skips missed runs and says so in the dialog; only defaults fill inputs | open |
| Users over-trust the Privacy tab or a future private tab | low | P2 | Wording says what the app does not control; no incognito claim | open |
