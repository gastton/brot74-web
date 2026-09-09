import type { DependabotPrRisk } from "./github.js";
import type { AccionResultado } from "./actions.js";
import type { RiskResult } from "./risk.js";

/**
 * BRT-143: gestión de tickets Jira del agente de triage.
 *
 * - Un ticket "batch" por día (Task, label `dependabot-batch-YYYY-MM-DD`)
 *   agrupa el resumen de la corrida. Se autocierra si no quedó ninguna PR
 *   crítica sin resolver.
 * - Un ticket dedicado por PR crítica (Bug, label `dependabot-pr-<numero>`)
 *   con el análisis de riesgo. No se autocierra — requiere revisión humana.
 *
 * No dispara Slack directamente (eso lo arma index.ts con el resultado
 * completo de la corrida — BRT-144 pasó de notificar por cada ticket
 * crítico nuevo a mandar un resumen único al final de cada corrida).
 *
 * Habla directo con la Jira REST API v3 (no el MCP de Atlassian: este
 * script corre en un runner de GitHub Actions, no dentro de una sesión de
 * Claude). Necesita `JIRA_BASE_URL`, `JIRA_EMAIL`, `JIRA_API_TOKEN` como
 * env vars — si faltan, no gestiona tickets pero no rompe el resto de la
 * corrida (mismo criterio que BRT-139 con Dependabot Alerts).
 *
 * Nota sobre el endpoint de búsqueda: `/rest/api/3/search` (clásico) está
 * dado de baja por Atlassian (410 Gone desde fines de octubre de 2025) —
 * acá se usa su reemplazo, `POST /rest/api/3/search/jql`, con paginación
 * por `nextPageToken` en vez de `startAt`.
 */

const PROJECT_KEY = process.env.JIRA_PROJECT_KEY ?? "BRT";

export type PrProcesada = DependabotPrRisk & RiskResult & AccionResultado;

export interface CriticaConTicket {
  pr: PrProcesada;
  jiraKey: string;
  jiraUrl: string;
}

export interface ResultadoJira {
  batchKey: string | null;
  criticasNuevas: string[];
  /** Todas las PRs críticas de la corrida con su ticket (nuevo o ya
   * existente) — BRT-144 lo usa para listar los pendientes en Slack. */
  criticas: CriticaConTicket[];
  omitido?: string;
}

function credencialesFaltantes(): string | null {
  const requeridas = ["JIRA_BASE_URL", "JIRA_EMAIL", "JIRA_API_TOKEN"];
  const faltan = requeridas.filter((nombre) => !process.env[nombre]);
  if (faltan.length === 0) return null;
  return `Faltan env vars de Jira: ${faltan.join(", ")}`;
}

function authHeader(): string {
  const email = process.env.JIRA_EMAIL ?? "";
  const token = process.env.JIRA_API_TOKEN ?? "";
  return `Basic ${Buffer.from(`${email}:${token}`).toString("base64")}`;
}

async function jiraFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const baseUrl = (process.env.JIRA_BASE_URL ?? "").replace(/\/$/, "");
  const res = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      Authorization: authHeader(),
      "Content-Type": "application/json",
      Accept: "application/json",
      ...init?.headers,
    },
  });

  // Se lee el body una sola vez como texto: evita el error genérico
  // "Unexpected end of JSON input" que no dice nada — si el parseo falla,
  // el mensaje de error trae el body real para poder diagnosticarlo.
  const cuerpoTexto = await res.text().catch(() => "");

  if (!res.ok) {
    throw new Error(`Jira ${init?.method ?? "GET"} ${path} -> HTTP ${res.status}: ${cuerpoTexto.slice(0, 500)}`);
  }
  if (!cuerpoTexto) return undefined as T;

  try {
    return JSON.parse(cuerpoTexto) as T;
  } catch {
    throw new Error(
      `Jira ${init?.method ?? "GET"} ${path} -> HTTP ${res.status} con body no-JSON: ${cuerpoTexto.slice(0, 500)}`,
    );
  }
}

/** Convierte texto plano (párrafos separados por línea en blanco) a ADF. */
function textoAAdf(texto: string) {
  const parrafos = texto
    .split(/\n{2,}/)
    .map((bloque) => bloque.trim())
    .filter(Boolean);

  return {
    type: "doc",
    version: 1,
    content: parrafos.map((bloque) => ({
      type: "paragraph",
      content: bloque.split("\n").flatMap((linea, i, arr) => {
        const nodos: Record<string, unknown>[] = [{ type: "text", text: linea || " " }];
        if (i < arr.length - 1) nodos.push({ type: "hardBreak" });
        return nodos;
      }),
    })),
  };
}

interface JiraIssueSummary {
  key: string;
}

async function buscarPorJql(jql: string): Promise<JiraIssueSummary[]> {
  const resultado = await jiraFetch<{ issues: JiraIssueSummary[] }>("/rest/api/3/search/jql", {
    method: "POST",
    body: JSON.stringify({ jql, maxResults: 5, fields: ["summary"] }),
  });
  return resultado.issues;
}

async function crearIssue(campos: Record<string, unknown>): Promise<string> {
  const creado = await jiraFetch<{ key: string }>("/rest/api/3/issue", {
    method: "POST",
    body: JSON.stringify({ fields: campos }),
  });
  return creado.key;
}

async function linkearIssues(inwardKey: string, outwardKey: string): Promise<void> {
  await jiraFetch("/rest/api/3/issueLink", {
    method: "POST",
    body: JSON.stringify({
      type: { name: "Relates" },
      inwardIssue: { key: inwardKey },
      outwardIssue: { key: outwardKey },
    }),
  });
}

async function cerrarComoDone(issueKey: string): Promise<void> {
  const { transitions } = await jiraFetch<{
    transitions: { id: string; to: { statusCategory: { key: string } } }[];
  }>(`/rest/api/3/issue/${issueKey}/transitions`);

  const done = transitions.find((t) => t.to.statusCategory.key === "done");
  if (!done) {
    console.warn(`No encontré una transición a "Done" para ${issueKey} — lo dejo como está.`);
    return;
  }
  await jiraFetch(`/rest/api/3/issue/${issueKey}/transitions`, {
    method: "POST",
    body: JSON.stringify({ transition: { id: done.id } }),
  });
}

function urlDelIssue(key: string): string {
  const baseUrl = (process.env.JIRA_BASE_URL ?? "").replace(/\/$/, "");
  return `${baseUrl}/browse/${key}`;
}

function urlDeLaCorrida(): string | undefined {
  const { GITHUB_SERVER_URL, GITHUB_REPOSITORY, GITHUB_RUN_ID } = process.env;
  if (!GITHUB_SERVER_URL || !GITHUB_REPOSITORY || !GITHUB_RUN_ID) return undefined;
  return `${GITHUB_SERVER_URL}/${GITHUB_REPOSITORY}/actions/runs/${GITHUB_RUN_ID}`;
}

function resumenBatchTexto(fecha: string, procesadas: PrProcesada[]): string {
  const criticas = procesadas.filter((pr) => pr.critica);
  const lineas = procesadas.map(
    (pr) =>
      `#${pr.numero} ${pr.paquete} (${pr.bumpType}${pr.severidad ? `, severidad ${pr.severidad}` : ""}) — ` +
      `${pr.critica ? "CRÍTICA" : "no crítica"} — ${pr.accion} — ${pr.motivoAccion} — ${pr.url}`,
  );

  const partes = [
    `Triage automático de PRs de Dependabot del ${fecha}.`,
    `${procesadas.length} PR(s) procesadas, ${criticas.length} crítica(s).`,
    lineas.join("\n"),
  ];

  const run = urlDeLaCorrida();
  if (run) partes.push(`Corrida completa: ${run}`);

  return partes.join("\n\n");
}

function resumenCriticaTexto(pr: PrProcesada): string {
  const partes = [
    `PR de Dependabot clasificada como crítica por el agente de triage (BRT-137).`,
    `Paquete: ${pr.paquete}\nBump: ${pr.bumpType}${pr.versionDesde && pr.versionHasta ? ` (${pr.versionDesde} → ${pr.versionHasta})` : ""}\nSeveridad: ${pr.severidad ?? "sin CVE asociado"}`,
    `Motivo: ${pr.motivo}`,
    `PR: ${pr.url}`,
  ];
  return partes.join("\n\n");
}

/**
 * Busca (o crea) el ticket batch del día. Idempotente: reintentar la misma
 * corrida el mismo día devuelve el ticket ya existente en vez de duplicar.
 */
async function findOrCreateBatchIssue(fecha: string, procesadas: PrProcesada[]): Promise<string> {
  const label = `dependabot-batch-${fecha}`;
  const existentes = await buscarPorJql(
    `project = "${PROJECT_KEY}" AND labels = "${label}" ORDER BY created DESC`,
  );
  if (existentes.length > 0) return existentes[0].key;

  return crearIssue({
    project: { key: PROJECT_KEY },
    issuetype: { name: "Task" },
    summary: `Triage de Dependabot — ${fecha}`,
    description: textoAAdf(resumenBatchTexto(fecha, procesadas)),
    labels: ["dependabot-batch", label],
  });
}

/**
 * Busca (o crea) el ticket dedicado de una PR crítica. Idempotente dentro
 * del mismo día: si ya existe uno abierto para esa PR, no crea otro.
 */
async function findOrCreateCriticalIssue(
  pr: PrProcesada,
): Promise<{ key: string; esNuevo: boolean }> {
  const label = `dependabot-pr-${pr.numero}`;
  const existentes = await buscarPorJql(
    `project = "${PROJECT_KEY}" AND labels = "${label}" AND statusCategory != Done ORDER BY created DESC`,
  );
  if (existentes.length > 0) return { key: existentes[0].key, esNuevo: false };

  const key = await crearIssue({
    project: { key: PROJECT_KEY },
    issuetype: { name: "Bug" },
    summary: `[Dependabot] PR crítica: ${pr.paquete} (#${pr.numero})`,
    description: textoAAdf(resumenCriticaTexto(pr)),
    labels: ["dependabot-critica", label],
  });
  return { key, esNuevo: true };
}

/**
 * Punto de entrada: actualiza Jira con el resultado de la corrida. No es
 * fatal si falla (credenciales ausentes, Jira caído) — loguea y sigue, no
 * tira abajo el resto del pipeline (las aprobaciones de Nivel 1 ya
 * corrieron antes de llegar acá).
 */
export async function actualizarJira(procesadas: PrProcesada[]): Promise<ResultadoJira> {
  const faltantes = credencialesFaltantes();
  if (faltantes) {
    console.warn(`${faltantes} — no se gestionan tickets de Jira esta corrida.`);
    return { batchKey: null, criticasNuevas: [], criticas: [], omitido: faltantes };
  }

  try {
    const fecha = new Date().toISOString().slice(0, 10);
    const batchKey = await findOrCreateBatchIssue(fecha, procesadas);

    const criticasDeHoy = procesadas.filter((pr) => pr.critica);
    const criticasNuevas: string[] = [];
    const criticas: CriticaConTicket[] = [];

    for (const pr of criticasDeHoy) {
      const { key, esNuevo } = await findOrCreateCriticalIssue(pr);
      criticas.push({ pr, jiraKey: key, jiraUrl: urlDelIssue(key) });
      if (esNuevo) {
        await linkearIssues(batchKey, key);
        criticasNuevas.push(key);
      }
    }

    if (criticasDeHoy.length === 0) {
      await cerrarComoDone(batchKey);
    }

    return { batchKey, criticasNuevas, criticas };
  } catch (err) {
    console.warn("Falló la gestión de tickets de Jira (se sigue sin romper la corrida):", (err as Error).message);
    return { batchKey: null, criticasNuevas: [], criticas: [], omitido: (err as Error).message };
  }
}
