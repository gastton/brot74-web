import { execFileSync } from "node:child_process";

/**
 * BRT-139: detecta las PRs abiertas de Dependabot y extrae la metadata de
 * riesgo (paquete, tipo de bump, severidad del CVE si existe) que después
 * consume el motor de clasificación (BRT-140) contra config/dependabot-risk.json.
 *
 * Usa el CLI `gh` en vez de octokit: es el mismo mecanismo que va a usar el
 * resto del agente de triage (BRT-142, aprobar PRs) y ya viene autenticado
 * en el runner de GitHub Actions sin necesidad de credenciales propias.
 */

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
    "git",
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
  const output = execFileSync("gh", ["api", path], { encoding: "utf8" });
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

// Título de Dependabot: "Bump next from 16.3.0 to 16.3.1". Sin anclar al
// inicio del string a propósito: este repo tiene conventional commits
// activado, así que Dependabot antepone "chore(deps): " / "chore(deps-dev): ".
const BUMP_TITLE_RE = /bump (\S+) from (\S+) to (\S+)/i;

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

function parseBump(
  title: string,
): Pick<DependabotPrRisk, "paquete" | "bumpType" | "versionDesde" | "versionHasta"> {
  const match = title.match(BUMP_TITLE_RE);
  if (!match) {
    // PR agrupada o título con formato no estándar (ej. dependabot.yml con
    // `groups:` a futuro) — no podemos identificar el paquete ni el bump,
    // el motor de clasificación (BRT-140) trata "unknown" como crítico.
    return {
      paquete: title,
      bumpType: "unknown",
      versionDesde: null,
      versionHasta: null,
    };
  }
  const [, paquete, versionDesde, versionHasta] = match;
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
