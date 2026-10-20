import { test, expect } from "@playwright/test";

/**
 * Smoke test de BRT-122, actualizado en BRT-136 (v31) y v50 para la landing
 * nueva (v3.3): confirma que Playwright está bien cableado end-to-end
 * (server + browser + CI) contra la home real de BROT74. Sin lógica de
 * negocio todavía — eso lo cubren los tickets de E2E que dependen de
 * este setup.
 */
test("la home carga y muestra el hero de la landing", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { level: 1, name: /Panes de fermentación natural/i })).toBeVisible();
  await expect(page.locator(".hero-card .eyebrow")).toHaveText("Micropanadería de masa madre");
});

// BRT-136: el CTA "Elegí tu BROT" tiene que usar el mismo router del sitio
// (buildFlowUrl de BRT-95) — no un link hardcodeado. v50: hay uno en el menú,
// uno en el hero y uno en la barra mobile; se prueba el del hero.
test("el CTA 'Elegí tu BROT' navega al flujo de selección de fecha", async ({ page }) => {
  await page.goto("/");

  // v59/v60: el texto depende del estado de pedidos ("Elegí tu BROT" con fecha abierta,
  // "Tu próximo BROT" sin ella); el flujo al que lleva es el mismo.
  await page.locator(".hero-card").getByRole("button", { name: /Elegí tu BROT|Tu próximo BROT/ }).click();
  await expect(page).toHaveURL(/[?&]step=slots/);
});

// v59/v60: la pill del hero dice si hay fecha abierta, y el pie es crema con el Instagram.
test("la landing muestra el estado de pedidos en la pill del hero", async ({ page }) => {
  await page.goto("/");

  await expect(page.locator(".hero-card .btn.st")).toContainText(/Elegí tu BROT|Tu próximo BROT/);
});

test("el pie de la landing muestra dónde y el Instagram", async ({ page }) => {
  await page.goto("/");

  await expect(page.locator("footer.ft")).toContainText("Mendiolaza · Córdoba");
  await expect(page.locator("footer.ft").getByRole("link", { name: "@brot.74" })).toBeVisible();
});
