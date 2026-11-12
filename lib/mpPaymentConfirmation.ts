import { Prisma } from "@/app/generated/prisma/client";
import { prisma } from "@/lib/db";
import { getOrderPayment, type MpOrderPayment } from "@/lib/mercadoPago";

// BRT-253/254/255: confirmar un pedido pagado con Mercado Pago.
//
// El aviso del webhook solo trae el ID de la orden de MP. Todo lo demás se le
// pregunta a MP (getOrderPayment) y se cruza con el pedido:
// - la orden está acreditada (status processed / accredited);
// - external_reference es el pedido y ese pedido tiene esta misma orden de MP;
// - el pedido sigue pendiente de pago;
// - lo pagado es exactamente el total del pedido.
// Si algo no cierra no se confirma y queda en los logs para revisarlo a mano.
//
// Idempotente: MP reintenta y puede mandar varios avisos de la misma orden. El
// cambio a "paid" está condicionado a que el pedido siga pendiente, y
// mpPaymentId es único, así que un pago no confirma dos veces.

export type MpConfirmationResult =
  | { outcome: "confirmed"; orderId: number }
  | { outcome: "already_confirmed"; orderId: number }
  | { outcome: "not_paid"; status: string }
  | { outcome: "rejected"; reason: string };

const ACCREDITED = { status: "processed", statusDetail: "accredited" };

/** "800.00" → 80000 centavos. Cualquier otro formato no se acepta. */
function toCents(amount: string | null): number | null {
  if (!amount) return null;
  const [pesos, decimals = "", ...rest] = amount.split(".");
  const validDecimals = amount.includes(".") ? /^\d{1,2}$/.test(decimals) : true;
  if (rest.length > 0 || !/^\d+$/.test(pesos) || !validDecimals) return null;
  return Number(pesos) * 100 + Number(decimals.padEnd(2, "0"));
}

function reject(reason: string, details: Record<string, unknown>): MpConfirmationResult {
  console.warn(`Mercado Pago: pago no confirmado (${reason})`, details);
  return { outcome: "rejected", reason };
}

function isUniqueViolation(err: unknown): boolean {
  return err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002";
}

export async function confirmMpOrder(mpOrderId: string): Promise<MpConfirmationResult> {
  const mpOrder: MpOrderPayment = await getOrderPayment(mpOrderId);
  const log = { mpOrderId: mpOrder.id, externalReference: mpOrder.externalReference };

  if (mpOrder.status !== ACCREDITED.status || mpOrder.statusDetail !== ACCREDITED.statusDetail) {
    // Creada, vencida, cancelada, etc.: no hay nada que confirmar.
    return { outcome: "not_paid", status: `${mpOrder.status}/${mpOrder.statusDetail}` };
  }

  const orderId = Number(mpOrder.externalReference);
  if (!Number.isInteger(orderId) || orderId <= 0) return reject("referencia inválida", log);

  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order || order.paymentMethod !== "mp" || order.mpOrderId !== mpOrder.id) {
    return reject("la referencia no corresponde a un pedido con esta orden de MP", log);
  }

  const payment = mpOrder.payments.find((p) => p.status === ACCREDITED.status) ?? mpOrder.payments[0];
  if (!payment) return reject("orden acreditada sin pagos", { ...log, orderId });

  if (order.status !== "pending") {
    if (order.mpPaymentId === payment.id) return { outcome: "already_confirmed", orderId };
    // Por ejemplo, cancelado por vencido y pagado igual: hay que devolver la plata a mano.
    return reject(`el pedido está ${order.status}`, { ...log, orderId, paymentId: payment.id });
  }

  const paidCents = toCents(mpOrder.totalPaidAmount);
  if (paidCents !== order.total * 100) {
    return reject("el monto pagado no coincide con el total", {
      ...log,
      orderId,
      paymentId: payment.id,
      paid: mpOrder.totalPaidAmount,
      total: order.total,
    });
  }

  try {
    const { count } = await prisma.order.updateMany({
      where: { id: order.id, status: "pending", mpOrderId: mpOrder.id },
      data: { status: "paid", paidAt: new Date(), mpPaymentId: payment.id },
    });
    if (count === 0) {
      // Otro aviso de la misma orden lo confirmó entre la lectura y el update.
      const current = await prisma.order.findUnique({ where: { id: order.id } });
      if (current?.mpPaymentId === payment.id) return { outcome: "already_confirmed", orderId };
      return reject(`el pedido cambió a ${current?.status}`, { ...log, orderId, paymentId: payment.id });
    }
  } catch (err) {
    if (isUniqueViolation(err)) return reject("el pago ya confirmó otro pedido", { ...log, orderId, paymentId: payment.id });
    throw err;
  }

  return { outcome: "confirmed", orderId };
}
