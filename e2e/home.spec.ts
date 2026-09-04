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
  await expect(page.getByRole("button", { name: /Reservá tu BROT/i })).toBeVisible();
});
