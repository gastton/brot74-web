import type { PrProcesada } from "./jira.js";

/**
 * BRT-144: notificación a Slack. Se dispara **solo** cuando se crea un
 * ticket dedicado nuevo por PR crítica (nunca por el ticket batch de
 * rutina) — separación de canales del diseño de la épica (BRT-137): ruido
 * operativo de bajo interés vs. señal de alta atención humana.
 *
 * Usa un Incoming Webhook (`SLACK_WEBHOOK_URL`). Si falta o falla, no es
 * fatal — se loguea y el resto de la corrida sigue (mismo criterio que
 * Dependabot Alerts y Jira).
 */

function severidadEmoji(severidad?: string): string {
  switch (severidad) {
    case "critical":
      return "🟣";
    case "high":
      return "🔴";
    case "moderate":
      return "🟠";
    case "low":
      return "🟡";
    default:
      return "⚪";
  }
}

function construirMensaje(pr: PrProcesada, jiraKey: string, jiraUrl: string) {
  const versiones =
    pr.versionDesde && pr.versionHasta ? `${pr.versionDesde} → ${pr.versionHasta}` : "sin datos de versión";

  const texto =
    `${severidadEmoji(pr.severidad)} *PR crítica de Dependabot: \`${pr.paquete}\`* (#${pr.numero})\n` +
    `Bump: *${pr.bumpType}* (${versiones})\n` +
    `Severidad: *${pr.severidad ?? "sin CVE asociado"}*\n` +
    `Motivo: ${pr.motivo}\n` +
    `<${pr.url}|Ver PR en GitHub> · <${jiraUrl}|${jiraKey} en Jira>`;

  return {
    text: `PR crítica de Dependabot: ${pr.paquete} (#${pr.numero}) — ${jiraKey}`,
    blocks: [
      {
        type: "section",
        text: { type: "mrkdwn", text: texto },
      },
    ],
  };
}

/**
 * Notifica una PR crítica recién detectada (ticket de Jira ya creado).
 * Nunca tira una excepción — un fallo de Slack no debe frenar el resto de
 * la corrida.
 */
export async function notificarCritica(pr: PrProcesada, jiraKey: string, jiraUrl: string): Promise<void> {
  // .trim(): `gh secret set` interactivo puede colar un salto de línea o
  // espacio al final si se pegó desde otro lado — evita un "Failed to
  // parse URL" por algo tan tonto como eso.
  const webhookUrl = process.env.SLACK_WEBHOOK_URL?.trim();
  if (!webhookUrl) {
    console.warn(`Falta SLACK_WEBHOOK_URL — no se notifica a Slack la PR crítica #${pr.numero}.`);
    return;
  }

  // GitHub Actions enmascara el valor del secret en los logs (sale como
  // "***"), así que un error de fetch no dice nada útil. La longitud sí
  // pasa el filtro de enmascarado (no es el secret, es un número) y alcanza
  // para diagnosticar sin exponer nada: una URL de Incoming Webhook real
  // ronda los 80-90 caracteres.
  if (!/^https:\/\//.test(webhookUrl)) {
    console.warn(
      `SLACK_WEBHOOK_URL no empieza con "https://" (longitud: ${webhookUrl.length}) — revisá que el secret` +
        ` tenga solo la URL, sin texto de más. No se notifica la PR crítica #${pr.numero}.`,
    );
    return;
  }

  try {
    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(construirMensaje(pr, jiraKey, jiraUrl)),
    });

    // Slack responde el webhook con HTTP 200 incluso para varios errores
    // (ej. "no_service" si el webhook está deshabilitado/borrado,
    // "channel_not_found", "action_prohibited") — el cuerpo, no el status,
    // es la única forma de distinguir un envío real de un fallo silencioso.
    // Éxito real: cuerpo es exactamente el texto "ok".
    const cuerpo = (await res.text().catch(() => "")).trim();
    if (!res.ok || cuerpo !== "ok") {
      throw new Error(`Slack webhook -> HTTP ${res.status}, body: "${cuerpo.slice(0, 300)}"`);
    }
  } catch (err) {
    console.warn(
      `No se pudo notificar a Slack la PR crítica #${pr.numero} (no rompe la corrida):`,
      (err as Error).message,
    );
  }
}
