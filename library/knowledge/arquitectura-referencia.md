---
name: Arquitectura de referencia
description: "Visión general de la arquitectura del sistema: componentes, tecnologías, integraciones y principios. Base para diseños técnicos y revisiones."
icon: 🏗️
kind: architecture
tags: [arquitectura]
audience: [dev, arquitectura]
targets: [any]
status: draft
version: "1.0.0"
author: AI Center
updated: 2026-10-24
---

> ✏️ Plantilla: describe vuestra arquitectura real. Cuanto más concreta, mejores diseños propondrá la IA.

## Contexto
- Sistema: …
- Usuarios principales: …

## Componentes
| Componente | Responsabilidad | Tecnología |
|---|---|---|
| Frontend web | UI de clientes | React + TypeScript |
| API | Lógica de negocio | Node.js / .NET / Java |
| Base de datos | Persistencia | PostgreSQL |
| Mensajería | Eventos de dominio | Kafka / Service Bus |

## Principios
- Arquitectura hexagonal: dominio aislado de infraestructura.
- Comunicación síncrona (REST) para consultas; asíncrona (eventos) entre dominios.
- Seguridad por defecto: OAuth2/OIDC, mínimo privilegio, cifrado en tránsito y reposo.
- Observabilidad: logs estructurados, trazas distribuidas, métricas RED.

## Restricciones
- Cloud: …
- Normativa: RGPD, …
