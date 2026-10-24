---
name: security-review
description: Analiza diseños o código buscando vulnerabilidades (OWASP Top 10, gestión de secretos, autorización, datos personales) y propone mitigaciones. Úsala en diseños técnicos y PRs sensibles.
metadata:
  title: Revisión de seguridad
  icon: 🛡️
  tags: seguridad, arquitectura, dev
  audience: dev, arquitectura
  targets: any
  status: stable
  version: "1.0.0"
  author: AI Center
  updated: 2026-10-24
---

# Revisión de seguridad

## Checklist (OWASP Top 10 y más)
- **Control de acceso**: autorización en servidor, mínimo privilegio, IDOR.
- **Criptografía**: TLS, cifrado en reposo, nada de algoritmos obsoletos.
- **Inyección**: SQL/NoSQL/comandos/LDAP; consultas parametrizadas.
- **Diseño inseguro**: amenazas modeladas (STRIDE) en flujos críticos.
- **Configuración**: cabeceras, CORS, *debug* desactivado, defaults seguros.
- **Componentes vulnerables**: dependencias actualizadas, SCA en CI.
- **Autenticación**: MFA, sesiones, rotación de tokens.
- **Integridad**: firmas, pipelines protegidos, supply chain.
- **Logging**: eventos de seguridad registrados, sin datos sensibles.
- **SSRF** y llamadas salientes controladas.
- **Secretos**: nunca en código; usa un gestor de secretos.
- **Datos personales**: minimización, base legal (RGPD), retención.

## Salida
Tabla de hallazgos con **severidad** (Crítica/Alta/Media/Baja), descripción, impacto y mitigación.
