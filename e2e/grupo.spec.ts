import { test, expect } from "@playwright/test";

// /grupo: vista previa propia en WhatsApp y botón al link de invitación
// (WHATSAPP_GROUP_INVITE_URL se define en playwright.config.ts).
test("/grupo responde 200 sin redirect y con su propia vista previa", async ({ page, request }) => {
  const res = await request.get("/grupo", { maxRedirects: 0 });
  expect(res.status()).toBe(200);

  await page.goto("/grupo");
  const og = (property: string) => page.locator(`meta[property="og:${property}"]`);
  await expect(og("title")).toHaveAttribute("content", "BROT74 · Pan de masa madre");
  await expect(og("description")).toHaveAttribute("content", "Sin conservantes ni aditivos. Preventa semanal · @brot.74");
  await expect(og("url")).toHaveAttribute("content", "https://brot74.com/grupo");
  // En dev la URL absoluta usa localhost; en producción, metadataBase.
  await expect(og("image")).toHaveAttribute("content", /^https?:\/\/[^/]+\/grupo\/opengraph-image/);
  await expect(og("image:width")).toHaveAttribute("content", "1200");
  await expect(og("image:height")).toHaveAttribute("content", "630");
});

test("/grupo tiene el botón al grupo y el link al sitio", async ({ page }) => {
  await page.goto("/grupo");

  await expect(page.getByRole("link", { name: "Unirme al grupo" })).toHaveAttribute("href", /^https:\/\/chat\.whatsapp\.com\//);
  await expect(page.getByRole("link", { name: "Ver panes y hacer un pedido" })).toHaveAttribute("href", "/");
});
