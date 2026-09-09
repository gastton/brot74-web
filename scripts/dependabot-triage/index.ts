import { appendFileSync } from "node:fs";
import { aplicarNivel1 } from "./actions.js";
import type { DependabotPrRisk } from "./github.js";
import { actualizarJira, type ResultadoJira } from "./jira.js";
import { classifyDependabotPRs } from "./risk.js";

/**
 * BRT-141: entrypoint que corre el workflow de GitHub Actions
 * (.github/workflows/dependabot-triage.yml).
 *
 * Detecta (BRT-139) + clasifica (BRT-140) + aplica Nivel 1 (BRT-142: aprueba
 * las no críticas con CI en verde, nunca mergea) + gestiona tickets de Jira
 * y notifica a Slack por cada crítica nueva (BRT-143/BRT-144) y deja un
 * resumen en el job summary de Actions.
 */

type PrProcesada = DependabotPrRisk & {
  critica: boolean;
  motivo: string;
  accion: "aprobada" | "no-tocada";
  motivoAccion: string;
};

const ICONO_ACCION: Record<PrProcesada["accion"], string> = {
  aprobada: "✅ aprobada",
  "no-tocada": "⏸️ sin tocar",
};

function resumenMarkdown(procesadas: PrProcesada[], jira: ResultadoJira): string {
  if (procesadas.length === 0) {
    return "## 🤖 Triage de Dependabot\n\nNo hay PRs abiertas de Dependabot hoy.\n";
  }

  const criticas = procesadas.filter((pr) => pr.critica).length;
  const aprobadas = procesadas.filter((pr) => pr.accion === "aprobada").length;

  const filas = procesadas
    .map((pr) => {
      const estado = pr.critica ? "🔴 crítica" : "🟢 no crítica";
      return `| [#${pr.numero}](${pr.url}) | \`${pr.paquete}\` | ${pr.bumpType} | ${pr.severidad ?? "-"} | ${estado} | ${ICONO_ACCION[pr.accion]} | ${pr.motivoAccion} |`;
    })
    .join("\n");

  const lineaJira = jira.omitido
    ? `_Jira: no se gestionaron tickets esta corrida (${jira.omitido})._`
    : `_Jira: ticket batch [${jira.batchKey}](${jiraIssueUrl(jira.batchKey)})` +
      (jira.criticasNuevas.length > 0
        ? `, tickets nuevos por crítica: ${jira.criticasNuevas.map((k) => `[${k}](${jiraIssueUrl(k)})`).join(", ")}.`
        : ".") +
      "_";

  return [
    "## 🤖 Triage de Dependabot",
    "",
    `${procesadas.length} PR(s) abierta(s) — ${criticas} crítica(s), ${aprobadas} aprobada(s) automáticamente.`,
    "",
    "| PR | Paquete | Bump | Severidad | Estado | Nivel 1 | Motivo |",
    "|---|---|---|---|---|---|---|",
    filas,
    "",
    "_El merge sigue siendo manual en todos los casos. Cada crítica nueva también se avisa" +
      " por Slack — ver [BRT-137](https://brot74.atlassian.net/browse/BRT-137)._",
    "",
    lineaJira,
  ].join("\n");
}

function jiraIssueUrl(key: string | null): string {
  if (!key) return "#";
  const baseUrl = (process.env.JIRA_BASE_URL ?? "").replace(/\/$/, "");
  return `${baseUrl}/browse/${key}`;
}

async function main(): Promise<void> {
  const clasificadas = classifyDependabotPRs();
  const procesadas = aplicarNivel1(clasificadas);

  console.log(JSON.stringify(procesadas, null, 2));

  const jira = await actualizarJira(procesadas);
  console.log("Jira:", jira);

  const summaryPath = process.env.GITHUB_STEP_SUMMARY;
  if (summaryPath) {
    appendFileSync(summaryPath, resumenMarkdown(procesadas, jira));
  }
}

main();
