---
id: decky-preview
description: Decky preview
---

# Decky preview (Decky Plugin Studio)

## When to use

- Iterating on `@decky/ui` components without full build/deploy/Steam loop
- Verifying D-pad focus paths after refactors
- Testing plugins that read hardware telemetry or call local Ollama
- Scripted regression via `preview.runSequence`

## Workflow

1. **Start preview** — `preview.start` or VSIX command `Decky: Open Preview`
2. **Check status** — `preview.status` returns running state, preview URL, hwState
3. **Simulate hardware** — `preview.setHardware({ cpuTemp: 85, battery: 8, preset: "Hot Game" })`
4. **Drive focus** — `preview.injectFocusEvent("Right")` or `preview.runSequence({ inputs: ["Right","Down","A"], delayMs: 80, snapshot: "dom" })`
5. **Backend RPC** — `preview.callRpc("method_name", [arg1, arg2])`
6. **Logs** — `preview.readLog({ lines: 50 })`

## runSequence result fields

- `focusPath` — ordered list of focus callbacks fired (from live focusManager log when preview is open)
- `activeElement` — selector chain for final focus
- `domSnapshot` — serialized QAM frame HTML (trimmed)
- `logTail` — recent plugin.log lines during the sequence

## Additional tools

- `preview.snapshotDom({ selector?, attrs?, text? })` — idle DOM inspect without input sequence
- `preview.captureScreenshot({ selector? })` — writes `screenshots/preview/PreviewCapture_*.png`
- `preview.setHttpAllow(allowlist)` — extend HTTP passthrough for mDNS / Steam Web API tests

## Limitations

Preview mocks `@decky/api` and `@decky/ui`. Tricky CEF focus bugs still need on-device QA via `deck.deploy` and the **master-debugger** persona.
