import { appendFileSync } from "node:fs";
import { classifyDependabotPRs } from "./risk.js";
import type { DependabotPrRisk } from "./github.js";

/**
 * BRT-141: entrypoint que corre el workflow de GitHub Actions
 * (.github/workflows/dependabot-triage.yml).
 *
 * Hoy solo detecta (BRT-139) + clasifica (BRT-140) y deja un resumen en el
 * job summary de Actions — todavía NO actúa sobre las PRs (Nivel 1:
 * BRT-142) ni gestiona tickets de Jira o Slack (BRT-143/BRT-144). Ese
 * trabajo se suma acá mismo a medida que esas historias se implementen.
 */

type PrClasificada = DependabotPrRisk & { critica: boolean; motivo: string };

function resumenMarkdown(clasificadas: PrClasificada[]): string {
  if (clasificadas.length === 0) {
    return "## 🤖 Triage de Dependabot\n\nNo hay PRs abiertas de Dependabot hoy.\n";
  }

  const criticas = clasificadas.filter((pr) => pr.critica).length;

  const filas = clasificadas
    .map((pr) => {
      const estado = pr.critica ? "🔴 crítica" : "🟢 no crítica";
      return `| [#${pr.numero}](${pr.url}) | \`${pr.paquete}\` | ${pr.bumpType} | ${pr.severidad ?? "-"} | ${estado} | ${pr.motivo} |`;
    })
    .join("\n");

  return [
    "## 🤖 Triage de Dependabot",
    "",
    `${clasificadas.length} PR(s) abierta(s) — ${criticas} crítica(s).`,
    "",
    "| PR | Paquete | Bump | Severidad | Estado | Motivo |",
    "|---|---|---|---|---|---|",
    filas,
    "",
    "_Nivel 1 (aprobación automática) y la gestión de tickets/Slack todavía no están" +
      " implementados — ver [BRT-137](https://brot74.atlassian.net/browse/BRT-137)._",
  ].join("\n");
}

function main(): void {
  const clasificadas = classifyDependabotPRs();

  console.log(JSON.stringify(clasificadas, null, 2));

  const summaryPath = process.env.GITHUB_STEP_SUMMARY;
  if (summaryPath) {
    appendFileSync(summaryPath, resumenMarkdown(clasificadas));
  }
}

main();
