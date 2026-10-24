---
name: Resumen de reunión y acciones
description: Resume una reunión (transcripción o notas) en decisiones, acciones con responsable y fecha, riesgos y dudas. Perfecto en Teams con Copilot M365.
icon: 🗒️
agent: asistente-negocio
tags: [negocio, reuniones, m365]
audience: [negocio, po, todos]
targets: [m365, any]
status: stable
version: "1.0.0"
author: AI Center
updated: 2026-10-24
---

Resume la reunión {{reunion: nombre o fecha de la reunión, o pega la transcripción/notas}}.

Devuelve:
1. **Resumen** en 3 líneas.
2. **Decisiones** tomadas.
3. **Acciones**: tabla con Acción · Responsable · Fecha (marca *[pendiente]* si no se dijo).
4. **Riesgos, bloqueos y preguntas abiertas**.
5. Borrador de **correo de seguimiento** para los asistentes (≤ 120 palabras).

No inventes responsables ni fechas.
