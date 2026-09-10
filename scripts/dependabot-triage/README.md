# Agente de triage de PRs de Dependabot

Runbook operativo del agente descripto en [BRT-137](https://brot74.atlassian.net/browse/BRT-137). Corre todos los días vía `.github/workflows/dependabot-triage.yml` (cron `0 12 * * *` = 09:00 Argentina) o a mano con `workflow_dispatch`.

## Qué hace, paso a paso

1. **Detecta** las PRs abiertas de `dependabot[bot]` en el repo y les saca metadata: paquete, tipo de bump (patch/minor/major), versión origen/destino y severidad del CVE asociado si Dependabot Alerts tiene uno (`github.ts`).
2. **Clasifica** cada PR como crítica o no crítica contra [`config/dependabot-risk.json`](../../config/dependabot-risk.json) (`risk.ts`). Reglas, en orden:
   - Bump `major` → siempre crítica, sin importar el paquete.
   - Paquete en `criticalPackages` → siempre crítica.
   - Severidad del CVE ≥ `severityBlockThreshold` → crítica.
   - Título de PR no reconocido (no se pudo parsear el bump) → crítica (fail-closed).
   - Nada de lo anterior → no crítica.
3. **Nivel 1** (`actions.ts`): a las PRs no críticas con los checks requeridos (`lint` + `integration` de `test.yml`) en verde, las aprueba con `gh pr review --approve`. **Nunca mergea** — eso es Nivel 2, a futuro ([BRT-146](https://brot74.atlassian.net/browse/BRT-146), backlog).
4. **Jira** (`jira.ts`): crea/actualiza un ticket batch del día (Task, se autocierra si no quedó ninguna crítica) y un ticket dedicado por cada PR crítica (Bug, no se autocierra — requiere revisión humana). Idempotente: reintentar la misma corrida el mismo día no duplica tickets.
5. **Slack** (`slack.ts`): al final de cada corrida manda un resumen al canal `#dependabot-alerts` — total de PRs encontradas, total resueltas automáticamente, y la lista de críticas pendientes con link a cada ticket de Jira.

`index.ts` orquesta los 5 pasos en ese orden y además deja el mismo resumen en el job summary de la corrida de GitHub Actions.

## Qué nunca hace

- **No mergea nada.** Nivel 1 solo aprueba; el merge es 100% manual, siempre.
- **No saltea el gate de calidad.** Una PR no crítica con `lint` o `integration` en rojo (o todavía corriendo) no se toca, nunca se aprueba a la fuerza.
- **No decide criticidad "a ojo".** Todo el criterio está en `config/dependabot-risk.json`, un archivo versionado y editable, no hardcodeado en el código.
- **No rompe la corrida completa por un fallo puntual.** Si falla leer severidad, aprobar una PR puntual, Jira o Slack, se loguea el error y la corrida sigue con el resto — ver "Diseño: por qué no rompe" más abajo.

## Secrets que necesita

Todos son **GitHub Actions repo secrets** (Settings → Secrets and variables → Actions), nunca en `.env` ni hardcodeados. Todos son optativos en el sentido de que su ausencia no rompe la corrida — pero sin ellos el agente hace cada vez menos.

| Secret | Para qué | Sin él |
|---|---|---|
| `DEPENDABOT_ALERTS_TOKEN` | Leer severidad real de CVE (Dependabot Alerts). El `GITHUB_TOKEN` default del workflow no puede leer ese endpoint bajo ningún permiso (confirmado con 403 en producción). | Clasifica igual, pero la regla de severidad nunca se dispara — solo bump major y paquete crítico. |
| `PR_APPROVE_TOKEN` | Aprobar PRs (Nivel 1). El `GITHUB_TOKEN` default **no puede aprobar PRs** — restricción de plataforma de GitHub, no de permisos del workflow (confirmado con "GitHub Actions is not permitted to approve pull requests"). | Detecta, clasifica y reporta, pero no aprueba nada. |
| `JIRA_BASE_URL` | URL del sitio, ej. `https://brot74.atlassian.net`. | No gestiona tickets de Jira. |
| `JIRA_EMAIL` | Email de la cuenta dueña del API token. | ídem |
| `JIRA_API_TOKEN` | API token de Jira (no OAuth — este script corre en un runner de Actions, no en una sesión de Claude con el MCP de Atlassian). | ídem |
| `SLACK_WEBHOOK_URL` | Incoming Webhook del canal `#dependabot-alerts`. | No manda el resumen a Slack (pero sigue todo lo demás). |

### Cómo crear cada uno

**`DEPENDABOT_ALERTS_TOKEN`**: fine-grained PAT en [github.com/settings/personal-access-tokens/new](https://github.com/settings/personal-access-tokens/new), scopeado solo a este repo, permiso de repo **"Dependabot alerts: Read-only"**.

**`PR_APPROVE_TOKEN`**: PAT **classic** (no fine-grained) en [github.com/settings/tokens/new](https://github.com/settings/tokens/new), scope `repo`. `gh pr review --approve` usa la API GraphQL de GitHub, que tiene soporte incompleto para fine-grained PATs — probado en producción, un fine-grained dio `401 Bad credentials` y el classic funcionó al toque.

**Jira**: API token en [id.atlassian.com/manage-profile/security/api-tokens](https://id.atlassian.com/manage-profile/security/api-tokens).

**Slack**: crear una app ("Blank app") en [api.slack.com/apps](https://api.slack.com/apps) → **Incoming Webhooks** → activar → **Add New Webhook to Workspace** → elegir el canal. La página de Incoming Webhooks de la app muestra siempre la URL vigente y a qué canal está atada — si un webhook "deja de andar", revisar ahí antes que en el código: la URL puede haber quedado vieja en el secret si se regeneró.

### Cómo setearlos

Siempre desde la terminal del que tiene el token, nunca pegándoselo a un agente/asistente en un chat:

```bash
gh secret set NOMBRE_DEL_SECRET --repo gastton/brot74-web
```

(sin `--body`, para que lo pida con input oculto). Para los que son solo texto plano sin datos sensibles (`JIRA_BASE_URL`, `JIRA_EMAIL`) se puede usar `--body "valor"` directo.

## Cómo agregar o quitar un paquete crítico

Editar `criticalPackages` en [`config/dependabot-risk.json`](../../config/dependabot-risk.json) — PR normal contra `main`, sin gate especial más allá del lint/CI del repo. El motor de clasificación (`risk.ts`) lo lee en cada corrida, no hace falta tocar código. Más detalle de cada campo del archivo en [`config/README.md`](../../config/README.md).

## Cómo correrlo a mano

**La corrida completa** (lo que corre el cron):

```bash
gh workflow run dependabot-triage.yml --ref main
```

o desde la UI: **Actions → Dependabot Triage Agent → Run workflow**.

**Pasos individuales, en local** (requiere `gh auth login` hecho; no usan `PR_APPROVE_TOKEN`/Jira/Slack salvo que esas env vars estén seteadas en la shell):

```bash
npm run dependabot:detect    # solo detección (github.ts)
npm run dependabot:classify  # detección + clasificación (risk.ts)
npm run dependabot:triage    # el pipeline completo (index.ts) — ¡esto aprueba PRs de verdad si PR_APPROVE_TOKEN está en el entorno!
```

## Si un ticket crítico queda abierto

1. Abrir el ticket en Jira (label `dependabot-pr-<numero>`) — tiene el paquete, el bump, la severidad y el motivo de por qué se clasificó como crítica.
2. Revisar la PR en GitHub (el ticket trae el link directo). Mirar el changelog del paquete si es un bump major, o el detalle del CVE si es por severidad.
3. Si está todo bien: aprobar y mergear la PR a mano, como cualquier otra. El ticket de Jira **no se cierra solo** — cerrarlo manualmente (transición a Done) una vez resuelta la PR.
4. Si no está bien (hay que ajustar código por el breaking change, por ejemplo): tratarlo como cualquier otro trabajo, con su propia rama si hace falta.
5. Si el paquete no debería ser crítico en primer lugar (falso positivo en el criterio): editar `config/dependabot-risk.json` — ver arriba.

## Troubleshooting — lo que ya se rompió una vez

- **`gh: Bad credentials (HTTP 401)` al aprobar** → `PR_APPROVE_TOKEN` es fine-grained. Recrear como classic (ver arriba).
- **`GitHub Actions is not permitted to approve pull requests`** → falta `PR_APPROVE_TOKEN`, se está usando el `GITHUB_TOKEN` default.
- **Dependabot Alerts da 403** → falta `DEPENDABOT_ALERTS_TOKEN`, o el permiso del fine-grained PAT no es "Dependabot alerts: Read-only".
- **Jira falla con `Unexpected end of JSON input`** → mensaje de error genérico ya corregido: ahora `jiraFetch()` loguea el body real de la respuesta. Si vuelve a pasar algo raro, revisar el log de la corrida, no adivinar.
- **Slack "no rompe pero tampoco llega nada"**: tres causas ya vistas, todas silenciosas si no se revisa el log:
  1. La URL del secret tenía un salto de línea/espacio de más (ya se hace `.trim()`).
  2. Slack responde el webhook con **HTTP 200 incluso en errores** como `no_service` o `channel_not_found` — el status por sí solo no alcanza, hay que chequear que el body sea exactamente `"ok"` (ya implementado). Si el log dice `No se pudo notificar a Slack ... body: "..."`, ese body es el error real de Slack, no hay que adivinar.
  3. Si nada de lo anterior explica un fallo silencioso: la URL del secret puede estar desactualizada (un webhook se regeneró y el secret no se actualizó) — comparar con la URL vigente en la página de Incoming Webhooks de la app.

## Roadmap: Nivel 1 → Nivel 2

Nivel 2 (merge automático de las PRs que Nivel 1 aprueba, sin intervención humana) es [BRT-146](https://brot74.atlassian.net/browse/BRT-146), en backlog a propósito. Antes de arrancarlo:

- Nivel 1 tiene que llevar un tiempo corriendo en producción sin falsos positivos (PRs aprobadas que en realidad no debían serlo).
- El criterio de cuándo habilitarlo es una decisión de producto, no solo código — no es "cuando alguien tenga tiempo de programarlo".
- El gate de calidad (`lint` + `integration`) sigue siendo obligatorio en cualquier nivel — Nivel 2 no lo saltea, solo automatiza el paso que hoy hace un humano después de ver la aprobación.

## Diseño: por qué no rompe

Cada integración externa (Dependabot Alerts, aprobar una PR puntual, Jira, Slack) está aislada: si falla, se loguea una advertencia clara y la corrida sigue con el resto. Esto es deliberado, no un descuido — un fallo de red en Slack no debería impedir que se aprueben PRs no críticas, y un error al aprobar una PR puntual no debería impedir que se actualice Jira para el resto. La única excepción es la propia gestión de Jira: si falla a mitad de camino (por ejemplo, crear un ticket sí pero linkearlo no), la corrida siguiente la retoma gracias a la búsqueda idempotente por label — no hace falta limpiar nada a mano.
