/**
 * BRT-144: notificación a Slack. Se dispara **en cada corrida** del triage
 * (haya o no PRs críticas) con un resumen: cuántas PRs se encontraron,
 * cuántas se resolvieron solas (Nivel 1) y cuáles críticas quedan
 * pendientes, cada una con link directo a su ticket de Jira.
 *
 * Usa un Incoming Webhook (`SLACK_WEBHOOK_URL`). Si falta o falla, no es
 * fatal — se loguea y el resto de la corrida sigue (mismo criterio que
 * Dependabot Alerts y Jira). No vuelve a consultar Jira/GitHub por su
 * cuenta: arma el mensaje solo con lo que ya generó la corrida.
 */

export interface CriticaPendiente {
  numero: number;
  paquete: string;
  jiraKey: string;
  jiraUrl: string;
}

export interface ResumenCorrida {
  totalEncontradas: number;
  totalResueltasAuto: number;
  criticasPendientes: CriticaPendiente[];
  /** Motivo por el que Jira no pudo confirmar el estado de las críticas
   * esta corrida (credenciales ausentes, Jira caído) — si está presente,
   * `criticasPendientes` puede no reflejar la realidad. */
  jiraOmitido?: string;
}

// Exportada para poder verificar el formato del mensaje sin pasar por la
// red (el resto de la función hace fetch a un webhook real).
export function construirMensaje(resumen: ResumenCorrida) {
  const { totalEncontradas, totalResueltasAuto, criticasPendientes, jiraOmitido } = resumen;

  const seccionCriticas = jiraOmitido
    ? `⚠️ No se pudo confirmar el estado de las críticas en Jira esta corrida (${jiraOmitido}).`
    : criticasPendientes.length === 0
      ? "✅ Ninguna crítica pendiente."
      : criticasPendientes
          .map((c) => `⚠️ <${c.jiraUrl}|${c.jiraKey}> — \`${c.paquete}\` (#${c.numero})`)
          .join("\n");

  const texto =
    `🤖 *Triage de Dependabot*\n` +
    `PRs encontradas: *${totalEncontradas}*\n` +
    `Resueltas automáticamente: *${totalResueltasAuto}*\n\n` +
    seccionCriticas;

  return {
    text: `Triage de Dependabot: ${totalEncontradas} PR(s), ${criticasPendientes.length} crítica(s) pendiente(s)`,
    blocks: [
      {
        type: "section",
        text: { type: "mrkdwn", text: texto },
      },
    ],
  };
}

/**
 * Notifica el resumen de la corrida completa. Nunca tira una excepción —
 * un fallo de Slack no debe frenar el resto de la corrida.
 */
export async function notificarResumenCorrida(resumen: ResumenCorrida): Promise<void> {
  // .trim(): `gh secret set` interactivo puede colar un salto de línea o
  // espacio al final si se pegó desde otro lado — evita un "Failed to
  // parse URL" por algo tan tonto como eso.
  const webhookUrl = process.env.SLACK_WEBHOOK_URL?.trim();
  if (!webhookUrl) {
    console.warn("Falta SLACK_WEBHOOK_URL — no se notifica el resumen de la corrida a Slack.");
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
        ` tenga solo la URL, sin texto de más. No se notifica el resumen.`,
    );
    return;
  }

  try {
    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(construirMensaje(resumen)),
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
    console.warn("No se pudo notificar el resumen a Slack (no rompe la corrida):", (err as Error).message);
  }
}
