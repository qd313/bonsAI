---
id: permissions-safety
title: Permission and safety model
tags: [security, permissions, alwaysApply]
alwaysApply: true
description: Capability-scoped user consent for privileged actions
---

## Permission and Safety Model

- ALWAYS require explicit, capability-scoped user permission before any privileged action (filesystem writes such as screenshots/notes, sudo/elevated commands, hardware controls, or web/search calls), default to deny until granted, and surface a clear consent prompt at the moment of use.
- NEVER execute, queue, or retry privileged actions after permission is denied or revoked; ALWAYS provide granular opt-out toggles and immediate revoke controls so users retain continuous authority over every high-impact capability.
