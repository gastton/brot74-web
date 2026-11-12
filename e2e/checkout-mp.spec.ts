import { test, expect, type APIRequestContext, type Page } from "@playwright/test";

/**
 * BRT-259: checkout con Mercado Pago en el navegador.
 *
 * Los datos se arman con la API del admin (producto, fecha y toggle), así el
 * test anda contra la base vacía del CI. Mercado Pago se simula en el
 * navegador: el link de pago, el checkout de MP y el estado del pago se
 * interceptan con page.route. La lógica del servidor contra MP la cubren los
 * tests de integración (tests/integration/mp-*.test.ts).
 */

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
const MP_CHECKOUT_URL = "https://mp.e2e.test/checkout";

test.describe.configure({ mode: "serial" });
test.skip(!ADMIN_PASSWORD, "Necesita ADMIN_PASSWORD para armar los datos con la API del admin");

let admin: APIRequestContext;
let slotId: number;
let productId: number;

async function setMpCheckout(enabled: boolean) {
  const res = await admin.patch("/api/admin/feature-flags", { data: { key: "mpCheckout", enabled } });
  expect(res.ok()).toBeTruthy();
}

test.beforeAll(async ({ playwright, baseURL }) => {
  admin = await playwright.request.newContext({ baseURL });
  expect((await admin.post("/api/admin/login", { data: { password: ADMIN_PASSWORD } })).ok()).toBeTruthy();

  const product = await admin.post("/api/admin/products", {
    data: { name: `E2E Campo ${Date.now()}`, price: 1000, active: true },
  });
  expect(product.ok()).toBeTruthy();
  productId = (await product.json()).id;

  // Fecha abierta dentro de 5 días: la crea después del producto para que tenga su stock.
  const date = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const slot = await admin.post("/api/admin/slots", {
    data: { date, dayLabel: "Fecha E2E", pickupTime: "8:00 - 12:00", location: "Lugar E2E" },
  });
  expect(slot.ok()).toBeTruthy();
  slotId = (await slot.json()).id;

  await setMpCheckout(true);
});

test.afterAll(async () => {
  await admin?.dispose();
});

/** Carrito con un pan de la fecha E2E, checkout con los datos cargados y paso de pago. Devuelve el número de pedido. */
async function reachPaymentStep(page: Page): Promise<number> {
  await page.addInitScript(
    ([slot, product]) => {
      if (location.hostname !== "localhost") return;
      if (!localStorage.getItem("brot74-cart")) {
        localStorage.setItem("brot74-cart", JSON.stringify({ slotId: slot, cart: { [product]: 1 } }));
      }
    },
    [slotId, productId]
  );
  await page.goto(`/?slot=${slotId}`);

  await page.getByRole("button", { name: /Ver mi pedido/ }).filter({ visible: true }).first().click();
  await page.getByLabel("Nombre y apellido").fill("Cliente E2E");
  await page.getByLabel("Teléfono (WhatsApp)").fill("1122334455");
  await page.getByRole("button", { name: /^Pagar\s*\$/ }).click();

  const label = page.getByText(/Pedido #\d+ · total/i);
  await expect(label).toBeVisible();
  return Number((await label.innerText()).match(/#(\d+)/)![1]);
}

/** Simula el link de pago de MP y su página de checkout. Devuelve los tokens que mandó la web. */
async function mockMpCheckout(page: Page): Promise<string[]> {
  const tokens: string[] = [];
  await page.route("**/api/orders/*/mercadopago", async (route) => {
    tokens.push(route.request().postDataJSON()?.token);
    await route.fulfill({ json: { checkoutUrl: MP_CHECKOUT_URL } });
  });
  await page.route("https://mp.e2e.test/**", (route) =>
    route.fulfill({ contentType: "text/html", body: "<h1>Checkout simulado de Mercado Pago</h1>" })
  );
  return tokens;
}

async function mockPaymentStatus(page: Page, status: string) {
  await page.route("**/api/orders/*/payment-status", (route) => route.fulfill({ json: { status } }));
}

test("pagar con Mercado Pago: ofrece MP y el alias, sale a MP y vuelve con el pago confirmado", async ({ page }) => {
  const tokens = await mockMpCheckout(page);
  const orderId = await reachPaymentStep(page);

  await expect(page.getByRole("button", { name: "Pagar con Mercado Pago" })).toBeVisible();
  await expect(page.getByText("o transferí al alias")).toBeVisible();
  await expect(page.getByRole("button", { name: "Ya transferí" })).toBeVisible();

  await page.getByRole("button", { name: "Pagar con Mercado Pago" }).click();
  await page.waitForURL(`${MP_CHECKOUT_URL}**`);
  await expect(page.getByRole("heading", { name: "Checkout simulado de Mercado Pago" })).toBeVisible();
  expect(tokens).toHaveLength(1);
  expect(tokens[0]).toEqual(expect.any(String));

  // Vuelta desde MP con el pago aprobado.
  await mockPaymentStatus(page, "approved");
  await page.goto(`/confirmacion?order=${orderId}&pago=mp`);
  await expect(page.getByRole("heading", { name: /Pago\s*confirmado/ })).toBeVisible();
  await expect(page.getByText("Pago acreditado")).toBeVisible();
  await expect(page.getByText("Fecha E2E · 8:00 - 12:00")).toBeVisible();
});

test("volver de MP sin pagar: muestra 'Todavía no pagaste' y deja volver a pagar", async ({ page }) => {
  const tokens = await mockMpCheckout(page);
  const orderId = await reachPaymentStep(page);

  await page.getByRole("button", { name: "Pagar con Mercado Pago" }).click();
  await page.waitForURL(`${MP_CHECKOUT_URL}**`);

  await mockPaymentStatus(page, "unpaid");
  await page.goto(`/confirmacion?order=${orderId}&pago=mp`);
  await expect(page.getByRole("heading", { name: /Todavía no\s*pagaste/ })).toBeVisible();
  await expect(page.getByText("Falta el pago")).toBeVisible();

  await page.getByRole("button", { name: "Ir a pagar con Mercado Pago" }).click();
  await page.waitForURL(`${MP_CHECKOUT_URL}**`);
  // El reintento usa el mismo token del pedido.
  expect(tokens).toHaveLength(2);
  expect(tokens[1]).toBe(tokens[0]);
});

test("con el toggle apagado el pago es solo por transferencia", async ({ page }) => {
  await setMpCheckout(false);
  try {
    await reachPaymentStep(page);

    await expect(page.getByRole("heading", { name: /Pagá por\s*transferencia/ })).toBeVisible();
    await expect(page.getByRole("button", { name: "Pagar con Mercado Pago" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "¡Listo!" })).toBeVisible();
  } finally {
    await setMpCheckout(true);
  }
});
