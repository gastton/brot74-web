// BRT-262: lo que la pantalla de vuelta desde Mercado Pago necesita saber del
// pedido. MP vuelve a /confirmacion?order=N&pago=mp, sin el token ni los datos
// de retiro, así que se guardan en el navegador antes de salir a MP.
//
// localStorage (y no sessionStorage): en el celular el pago puede terminar en
// la app de MP y volver en otra pestaña. Envuelto en try/catch porque puede no
// estar disponible (modo incógnito, navegador que lo bloquea); sin él, la
// pantalla de vuelta muestra el mensaje genérico.

export interface OrderReturnInfo {
  /** Token del pedido (BRT-251), para consultar su estado de pago. */
  token: string;
  /** Query de la confirmación con retiro, lugar y modo (`&pickup=…&place=…`). */
  confirmationQuery: string;
}

const key = (orderId: number | string) => `brot74-order-${orderId}`;

export function saveOrderReturn(orderId: number, info: OrderReturnInfo) {
  try {
    localStorage.setItem(key(orderId), JSON.stringify(info));
  } catch {
    /* localStorage no disponible */
  }
}

/** Texto guardado tal cual (estable entre llamadas, apto para useSyncExternalStore). */
export function readOrderReturnRaw(orderId: string): string | null {
  try {
    return localStorage.getItem(key(orderId));
  } catch {
    return null;
  }
}

export function parseOrderReturn(raw: string | null): OrderReturnInfo | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed?.token !== "string") return null;
    return {
      token: parsed.token,
      confirmationQuery: typeof parsed.confirmationQuery === "string" ? parsed.confirmationQuery : "",
    };
  } catch {
    return null;
  }
}
