import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import {
  getOpenDependabotPRsWithRisk,
  type BumpType,
  type DependabotPrRisk,
  type SeverityLevel,
} from "./github.js";

/**
 * BRT-140: motor de clasificación de riesgo. Función pura — no hace fetch
 * ni llama a `gh`, solo lee config/dependabot-risk.json (BRT-138) y aplica
 * sus reglas a la metadata que ya extrajo BRT-139 (github.ts).
 */

export interface DependabotRiskConfig {
  version: number;
  alwaysBlockOnMajorBump: boolean;
  severityLevels: SeverityLevel[];
  severityBlockThreshold: SeverityLevel;
  criticalPackages: string[];
}

export interface RiskInput {
  paquete: string;
  bumpType: BumpType;
  severidad?: SeverityLevel;
}

export interface RiskResult {
  critica: boolean;
  motivo: string;
}

const CONFIG_PATH = fileURLToPath(
  new URL("../../config/dependabot-risk.json", import.meta.url),
);

let cachedConfig: DependabotRiskConfig | null = null;

/**
 * Lee y cachea config/dependabot-risk.json. Expuesta (no solo interna) para
 * que quien orqueste el agente pueda leerla una vez y pasarla explícita a
 * `classifyRisk` en vez de que cada llamada toque el filesystem.
 */
export function loadRiskConfig(): DependabotRiskConfig {
  if (!cachedConfig) {
    cachedConfig = JSON.parse(
      readFileSync(CONFIG_PATH, "utf8"),
    ) as DependabotRiskConfig;
  }
  return cachedConfig;
}

function severityRank(levels: SeverityLevel[]): Partial<Record<SeverityLevel, number>> {
  const rank: Partial<Record<SeverityLevel, number>> = {};
  levels.forEach((level, index) => {
    rank[level] = index;
  });
  return rank;
}

/**
 * Clasifica una PR como crítica o no, con el motivo explícito de la
 * decisión (mismo texto que después va tal cual al ticket de Jira / mensaje
 * de Slack — BRT-143/BRT-144). Reglas, en orden:
 *
 * 0. Bump type "unknown" (título de PR no reconocido, ver BRT-139) → no se
 *    puede evaluar nada más, frena por default (fail-closed).
 * 1. Bump major → frena siempre, sin importar el paquete
 *    (`alwaysBlockOnMajorBump` en la config).
 * 2. Paquete en `criticalPackages` → frena siempre.
 * 3. Severidad del CVE asociado >= `severityBlockThreshold` → frena.
 * 4. Ninguna de las anteriores → no crítica.
 */
export function classifyRisk(
  pr: RiskInput,
  config: DependabotRiskConfig = loadRiskConfig(),
): RiskResult {
  if (pr.bumpType === "unknown") {
    return {
      critica: true,
      motivo:
        "No se pudo determinar el tipo de bump: el título de la PR no matchea el formato esperado de Dependabot.",
    };
  }

  if (config.alwaysBlockOnMajorBump && pr.bumpType === "major") {
    return {
      critica: true,
      motivo: `Bump major de "${pr.paquete}" — cualquier major frena, sin importar el paquete.`,
    };
  }

  if (config.criticalPackages.includes(pr.paquete)) {
    return {
      critica: true,
      motivo: `"${pr.paquete}" está en la lista de paquetes críticos (config/dependabot-risk.json).`,
    };
  }

  if (pr.severidad) {
    const rank = severityRank(config.severityLevels);
    const severidadRank = rank[pr.severidad];
    const umbralRank = rank[config.severityBlockThreshold];
    if (
      severidadRank !== undefined &&
      umbralRank !== undefined &&
      severidadRank >= umbralRank
    ) {
      return {
        critica: true,
        motivo: `CVE de severidad "${pr.severidad}" (umbral configurado: "${config.severityBlockThreshold}").`,
      };
    }
  }

  return {
    critica: false,
    motivo:
      "No dispara ninguna regla de criticidad: bump no-major, paquete no crítico, sin CVE de severidad relevante.",
  };
}

/**
 * Conveniencia para quien orqueste el agente (BRT-141): detecta las PRs
 * abiertas (BRT-139) y les pega la clasificación de riesgo a cada una.
 */
export function classifyDependabotPRs(
  prs: DependabotPrRisk[] = getOpenDependabotPRsWithRisk(),
  config: DependabotRiskConfig = loadRiskConfig(),
): (DependabotPrRisk & RiskResult)[] {
  return prs.map((pr) => ({ ...pr, ...classifyRisk(pr, config) }));
}

// Permite correrlo a mano: `npx tsx scripts/dependabot-triage/risk.ts`
// (requiere `gh auth login` hecho localmente — reusa la detección de BRT-139).
if (import.meta.url === `file://${process.argv[1]}`) {
  const clasificadas = classifyDependabotPRs();
  console.log(JSON.stringify(clasificadas, null, 2));
}
