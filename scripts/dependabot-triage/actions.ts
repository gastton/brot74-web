import { ghApi, repoSlug, runGh, type DependabotPrRisk } from "./github.js";
import type { RiskResult } from "./risk.js";

/**
 * BRT-142: Nivel 1 del agente — aprueba automáticamente las PRs no
 * críticas cuando sus checks obligatorios (`lint` e `integration` de
 * test.yml) están en verde. Nunca mergea: eso queda para Nivel 2
 * (BRT-146, a futuro) y sigue siendo 100% manual acá.
 */

// Los checks que test.yml expone como jobs — deben coincidir con los
// `name:` de los jobs en .github/workflows/test.yml.
const REQUIRED_CHECKS = ["lint", "integration"];

export type EstadoChecks = "verde" | "rojo" | "pendiente";

export type Accion = "aprobada" | "no-tocada";

export interface AccionResultado {
  accion: Accion;
  motivoAccion: string;
}

interface PullRequestDetail {
  head: { sha: string };
}

interface CheckRun {
  name: string;
  status: "queued" | "in_progress" | "completed";
  conclusion: string | null;
  started_at: string;
}

/**
 * Toma, para cada check requerido, la corrida más reciente (por si hubo
 * un re-run) y evalúa el estado combinado:
 *
 * - "rojo" si algún check requerido terminó y no fue exitoso.
 * - "pendiente" si algún check requerido todavía no terminó o ni corrió.
 * - "verde" solo si los dos requeridos terminaron con éxito.
 */
export function estadoDeChecksRequeridos(checkRuns: CheckRun[]): EstadoChecks {
  const masReciente = (nombre: string): CheckRun | undefined =>
    checkRuns
      .filter((run) => run.name === nombre)
      .sort((a, b) => b.started_at.localeCompare(a.started_at))[0];

  const estados = REQUIRED_CHECKS.map((nombre) => masReciente(nombre));

  if (estados.some((run) => !run || run.status !== "completed")) {
    return "pendiente";
  }
  if (estados.some((run) => run?.conclusion !== "success")) {
    return "rojo";
  }
  return "verde";
}

function getEstadoChecksParaPR(owner: string, repo: string, numero: number): EstadoChecks {
  const pr = ghApi<PullRequestDetail>(`repos/${owner}/${repo}/pulls/${numero}`);
  const { check_runs: checkRuns } = ghApi<{ check_runs: CheckRun[] }>(
    `repos/${owner}/${repo}/commits/${pr.head.sha}/check-runs?per_page=100`,
  );
  return estadoDeChecksRequeridos(checkRuns);
}

function aprobarPR(owner: string, repo: string, numero: number, motivoClasificacion: string): void {
  runGh([
    "pr",
    "review",
    String(numero),
    "--repo",
    `${owner}/${repo}`,
    "--approve",
    "--body",
    `🤖 Aprobada automáticamente por el agente de triage de Dependabot (Nivel 1) — ${motivoClasificacion} CI en verde (lint + integration). El merge sigue siendo manual.`,
  ]);
}

/**
 * Aplica el Nivel 1 a cada PR ya clasificada (BRT-140): aprueba las no
 * críticas con CI en verde, y deja constancia del motivo cuando no toca
 * una PR (crítica, CI en rojo, o checks todavía corriendo).
 */
export function aplicarNivel1<T extends DependabotPrRisk & RiskResult>(
  clasificadas: T[],
): (T & AccionResultado)[] {
  const [owner, repo] = repoSlug().split("/");

  return clasificadas.map((pr) => {
    if (pr.critica) {
      return {
        ...pr,
        accion: "no-tocada",
        motivoAccion: "PR crítica — requiere revisión humana, el agente no actúa.",
      };
    }

    const estado = getEstadoChecksParaPR(owner, repo, pr.numero);

    if (estado === "pendiente") {
      return {
        ...pr,
        accion: "no-tocada",
        motivoAccion: "No crítica, pero lint/integration todavía no terminaron — se evalúa de nuevo mañana.",
      };
    }

    if (estado === "rojo") {
      return {
        ...pr,
        accion: "no-tocada",
        motivoAccion: "No crítica, pero CI está en rojo (lint o integration fallaron) — no se aprueba sola.",
      };
    }

    aprobarPR(owner, repo, pr.numero, pr.motivo);
    return {
      ...pr,
      accion: "aprobada",
      motivoAccion: "No crítica y CI en verde — aprobada automáticamente. Falta el merge manual.",
    };
  });
}
