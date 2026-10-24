---
name: Meeting summary and actions
description: Summarizes a meeting (transcript or notes) into decisions, actions with owner and date, risks and questions. Perfect in Teams with Copilot M365.
icon: 🗒️
agent: business-assistant
tags: [business, meetings, m365]
audience: [business, po, all]
targets: [m365, any]
status: stable
version: "1.0.0"
author: AI Center
updated: 2026-10-24
---

Summarize the meeting {{meeting: meeting name or date, or paste the transcript/notes}}.

Return:
1. **Summary** in 3 lines.
2. **Decisions** made.
3. **Actions**: table with Action · Owner · Date (mark *[pending]* if not mentioned).
4. **Risks, blockers and open questions**.
5. Draft **follow-up email** for the attendees (≤ 120 words).

Do not invent owners or dates.
