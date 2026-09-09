import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { delimiter, join } from "node:path";

/**
 * BRT-139: detecta las PRs abiertas de Dependabot y extrae la metadata de
 * riesgo (paquete, tipo de bump, severidad del CVE si existe) que después
 * consume el motor de clasificación (BRT-140) contra config/dependabot-risk.json.
 *
 * Usa el CLI `gh` en vez de octokit: es el mismo mecanismo que va a usar el
 * resto del agente de triage (BRT-142, aprobar PRs) y ya viene autenticado
 * en el runner de GitHub Actions sin necesidad de credenciales propias.
 */

/**
 * Resuelve el path absoluto de un ejecutable buscando en las carpetas de
 * `PATH`, en vez de pasarle el nombre pelado a `execFileSync` y dejar que
 * el propio proceso hijo lo busque en el momento de ejecutarlo (Sonar
 * S4036 / CWE-426, "Untrusted Search Path"). El binario resuelto se cachea
 * por nombre para no recorrer `PATH` en cada llamada.
 */
const resolvedExecutables = new Map<string, string>();

function resolveExecutable(name: string): string {
  const cached = resolvedExecutables.get(name);
  if (cached) return cached;

  const candidates = process.platform === "win32" ? [`${name}.exe`, `${name}.cmd`] : [name];
  const dirs = (process.env.PATH ?? "").split(delimiter).filter(Boolean);

  for (const dir of dirs) {
    for (const candidate of candidates) {
      const full = join(dir, candidate);
      if (existsSync(full)) {
        resolvedExecutables.set(name, full);
        return full;
      }
    }
  }

  throw new Error(`No encontré "${name}" en el PATH del sistema.`);
}

export type BumpType = "major" | "minor" | "patch" | "unknown";

export type SeverityLevel = "low" | "moderate" | "high" | "critical";

const SEVERITY_RANK: Record<SeverityLevel, number> = {
  low: 0,
  moderate: 1,
  high: 2,
  critical: 3,
};

export interface DependabotPrRisk {
  numero: number;
  titulo: string;
  url: string;
  paquete: string;
  bumpType: BumpType;
  versionDesde: string | null;
  versionHasta: string | null;
  severidad?: SeverityLevel;
}

interface GitHubPullRequest {
  number: number;
  title: string;
  html_url: string;
  user: { login: string; type: string } | null;
}

interface DependabotAlert {
  state: string;
  security_advisory: { severity: string };
  dependency: { package: { name: string } };
}

/**
 * Resuelve "owner/repo". En GitHub Actions viene en `GITHUB_REPOSITORY`;
 * corriendo el script a mano lo saca del remote de git.
 */
export function repoSlug(): string {
  const fromEnv = process.env.GITHUB_REPOSITORY;
  if (fromEnv) return fromEnv;

  const remote = execFileSync(
    resolveExecutable("git"),
    ["config", "--get", "remote.origin.url"],
    { encoding: "utf8" },
  ).trim();
  const match = remote.match(/[:/]([^/]+\/[^/]+?)(\.git)?$/);
  if (!match) {
    throw new Error(`No pude determinar owner/repo desde el remote: ${remote}`);
  }
  return match[1];
}

function ghApi<T>(path: string): T {
  const output = execFileSync(resolveExecutable("gh"), ["api", path], {
    encoding: "utf8",
  });
  return JSON.parse(output) as T;
}

function listOpenDependabotPRs(owner: string, repo: string): GitHubPullRequest[] {
  const prs = ghApi<GitHubPullRequest[]>(
    `repos/${owner}/${repo}/pulls?state=open&per_page=100`,
  );
  return prs.filter((pr) => pr.user?.login === "dependabot[bot]");
}

/**
 * Lee las Dependabot Alerts abiertas del repo para cruzar severidad por
 * paquete. No es fatal si falla (repo sin alerts habilitadas, token sin el
 * scope `security_events`): el resto del triage sigue sin severidad.
 */
function listOpenDependabotAlerts(owner: string, repo: string): DependabotAlert[] {
  try {
    return ghApi<DependabotAlert[]>(
      `repos/${owner}/${repo}/dependabot/alerts?state=open&per_page=100`,
    );
  } catch (err) {
    console.warn(
      "No se pudieron leer Dependabot Alerts (se sigue sin severidad):",
      (err as Error).message,
    );
    return [];
  }
}

function severityForPackage(
  alerts: DependabotAlert[],
  paquete: string,
): SeverityLevel | undefined {
  const severidades = alerts
    .filter((a) => a.dependency?.package?.name === paquete)
    .map((a) => a.security_advisory?.severity as SeverityLevel)
    .filter((s): s is SeverityLevel => s in SEVERITY_RANK);

  if (severidades.length === 0) return undefined;
  return severidades.sort((a, b) => SEVERITY_RANK[b] - SEVERITY_RANK[a])[0];
}

function parseVersionParts(version: string): [number, number, number] | null {
  const cleaned = version.replace(/^v/, "").split(/[-+]/)[0];
  const parts = cleaned.split(".").map(Number);
  if (parts.length < 2 || parts.some((n) => Number.isNaN(n))) return null;
  const [major, minor = 0, patch = 0] = parts;
  return [major, minor, patch];
}

function bumpTypeFromVersions(desde: string, hasta: string): BumpType {
  const from = parseVersionParts(desde);
  const to = parseVersionParts(hasta);
  if (!from || !to) return "unknown";
  if (to[0] !== from[0]) return "major";
  if (to[1] !== from[1]) return "minor";
  if (to[2] !== from[2]) return "patch";
  return "unknown";
}

const UNKNOWN_BUMP = {
  bumpType: "unknown" as const,
  versionDesde: null,
  versionHasta: null,
};

/**
 * Parsea el título de Dependabot: "Bump next from 16.3.0 to 16.3.1". Este
 * repo tiene conventional commits activado, así que Dependabot antepone
 * "chore(deps): " / "chore(deps-dev): " — por eso se busca "bump " en
 * cualquier posición del título en vez de anclar al inicio.
 *
 * Parseo manual con `indexOf`/`slice` en vez de un único regex con varios
 * cuantificadores sin límite (evita el riesgo de backtracking súper-lineal
 * que marca Sonar en ese patrón — acá no hace falta, son tres substrings
 * separados por literales fijos).
 */
function parseBump(
  title: string,
): Pick<DependabotPrRisk, "paquete" | "bumpType" | "versionDesde" | "versionHasta"> {
  const lower = title.toLowerCase();
  const bumpAt = lower.indexOf("bump ");
  if (bumpAt === -1) {
    return { paquete: title, ...UNKNOWN_BUMP };
  }

  const fromAt = lower.indexOf(" from ", bumpAt);
  const toAt = fromAt === -1 ? -1 : lower.indexOf(" to ", fromAt);
  if (fromAt === -1 || toAt === -1) {
    return { paquete: title, ...UNKNOWN_BUMP };
  }

  const paquete = title.slice(bumpAt + "bump ".length, fromAt).trim();
  const versionDesde = title.slice(fromAt + " from ".length, toAt).trim();
  // Corta en el primer espacio para descartar sufijos tipo "in /apps/web"
  // que Dependabot agrega en monorepos con varios `directory:`.
  const resto = title.slice(toAt + " to ".length).trimStart();
  const espacioAt = resto.indexOf(" ");
  const versionHasta = espacioAt === -1 ? resto : resto.slice(0, espacioAt);

  if (!paquete || !versionDesde || !versionHasta) {
    return { paquete: title, ...UNKNOWN_BUMP };
  }

  return {
    paquete,
    bumpType: bumpTypeFromVersions(versionDesde, versionHasta),
    versionDesde,
    versionHasta,
  };
}

/**
 * Punto de entrada del módulo: lista las PRs abiertas de Dependabot con su
 * metadata de riesgo lista para que BRT-140 la clasifique.
 */
export function getOpenDependabotPRsWithRisk(): DependabotPrRisk[] {
  const slug = repoSlug();
  const [owner, repo] = slug.split("/");
  const prs = listOpenDependabotPRs(owner, repo);
  const alerts = listOpenDependabotAlerts(owner, repo);

  return prs.map((pr) => {
    const bump = parseBump(pr.title);
    return {
      numero: pr.number,
      titulo: pr.title,
      url: pr.html_url,
      severidad: severityForPackage(alerts, bump.paquete),
      ...bump,
    };
  });
}

// Permite correrlo a mano: `npx tsx scripts/dependabot-triage/github.ts`
// (requiere `gh auth login` hecho localmente).
if (import.meta.url === `file://${process.argv[1]}`) {
  const prs = getOpenDependabotPRsWithRisk();
  console.log(JSON.stringify(prs, null, 2));
}
