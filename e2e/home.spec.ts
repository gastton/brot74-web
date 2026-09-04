import { test, expect } from "@playwright/test";

/**
 * Smoke test de BRT-122: confirma que Playwright está bien cableado
 * end-to-end (server + browser + CI) contra la home real de BROT74.
 * Sin lógica de negocio todavía — eso lo cubren los tickets de E2E
 * que dependen de este setup.
 */
test("la home carga y muestra el hero", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: /Pan de fermentación natural/i })).toBeVisible();
});

// BRT-135 (fix): el CTA de pedidos vive en un solo lugar, la sección de
// cierre — no hay botón propio en el hero. Se llega a él haciendo scroll.
test("el CTA de pedidos está en la sección de cierre", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("button", { name: /Elegí tu fecha/i }).scrollIntoViewIfNeeded();
  await expect(page.getByRole("button", { name: /Elegí tu fecha/i })).toBeVisible();
});
