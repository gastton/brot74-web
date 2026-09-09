# `config/`

Configuración versionada que usan procesos automatizados del repo (no la app en runtime). No es un directorio de config de Next.js/build tools — esos siguen viviendo en la raíz (`next.config.ts`, `eslint.config.mjs`, etc.).

## `dependabot-risk.json`

Knowledge asset del **agente de triage de PRs de Dependabot** ([BRT-137](https://brot74.atlassian.net/browse/BRT-137)). Define, de forma explícita y editable por humanos, qué convierte una PR de Dependabot en "crítica" (no se resuelve sola, genera ticket dedicado + aviso en Slack) vs. "no crítica" (se puede aprobar automáticamente).

El motor de clasificación ([BRT-140](https://brot74.atlassian.net/browse/BRT-140)) lee este archivo tal cual — no hardcodea ningún criterio en el código.

### Campos

| Campo | Tipo | Descripción |
|---|---|---|
| `version` | `number` | Versión del schema de este archivo. Subirla si se agrega/renombra un campo de forma incompatible. |
| `alwaysBlockOnMajorBump` | `boolean` | Si es `true`, cualquier bump **major** de cualquier paquete (esté o no en `criticalPackages`) se clasifica como crítico. Pensado para quedar siempre en `true`; existe como campo explícito para que la regla sea visible, no implícita en el código. |
| `severityLevels` | `string[]` | Orden de severidad de menor a mayor, tal como las reporta la API de Dependabot Alerts de GitHub. No editar salvo que GitHub cambie sus niveles. |
| `severityBlockThreshold` | `string` | Uno de los valores de `severityLevels`. Una PR con un CVE de esta severidad o mayor se clasifica como crítica, aunque el paquete no esté en `criticalPackages` y el bump no sea major. |
| `criticalPackages` | `string[]` | Paquetes que siempre frenan, sin importar el tipo de bump ni si tienen CVE. Pensados para dependencias que tocan auth, criptografía, acceso a datos o storage — donde un bug de upgrade es más caro que en el resto. |

### Cómo agregar o quitar un paquete crítico

1. Editar `criticalPackages` en `dependabot-risk.json` (nombre exacto tal como aparece en `package.json`, incluyendo el scope si lo tiene, ej. `@vercel/blob`).
2. PR normal contra `main` — este archivo no tiene gate especial más allá del lint/CI del repo.
3. No hace falta tocar código: el motor de clasificación (BRT-140) lo lee en cada corrida del agente.

### Por qué estos paquetes están en la lista inicial

- `next` — framework; una regresión de seguridad o de build rompe todo el sitio.
- `prisma`, `@prisma/client` — acceso a la base de datos de producción.
- `@vercel/blob` — storage de imágenes de producto; maneja tokens de acceso.
- `jsonwebtoken`, `jose` — emisión/verificación de sesión (JWT).
- `bcryptjs` — hashing de contraseñas del panel admin.

Dependencias de build/testing (`eslint`, `tailwindcss`, `vitest`, `@playwright/test`, etc.) no están en la lista: un patch/minor ahí no compromete datos ni auth, y de todas formas un bump **major** en cualquiera de ellas también frena por la regla `alwaysBlockOnMajorBump`.

### Fuera de alcance de este archivo

- La lógica que lo lee ([BRT-140](https://brot74.atlassian.net/browse/BRT-140)).
- Qué hace el agente con el resultado (aprobar, crear ticket, avisar por Slack) — ver el resto de historias hijas de [BRT-137](https://brot74.atlassian.net/browse/BRT-137).
