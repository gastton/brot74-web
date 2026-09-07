import { test, expect } from "@playwright/test";

/**
 * Smoke test de BRT-122, actualizado en BRT-136 para la landing nueva
 * (v31): confirma que Playwright está bien cableado end-to-end
 * (server + browser + CI) contra la home real de BROT74. Sin lógica de
 * negocio todavía — eso lo cubren los tickets de E2E que dependen de
 * este setup.
 */
test("la home carga y muestra el hero de la landing", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "BROT 74", exact: true, level: 1 })).toBeVisible();
  await expect(page.getByText(/Panes de fermentación natural/i)).toBeVisible();
});

// BRT-136: el CTA "Elegí tu BROT" del rail fijo tiene que usar el mismo
// router del sitio (buildFlowUrl de BRT-95) — no un link hardcodeado.
test("el CTA 'Elegí tu BROT' navega al flujo de selección de fecha", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("button", { name: "Elegí tu BROT" }).click();
  await expect(page).toHaveURL(/[?&]step=slots/);
});
