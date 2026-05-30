"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import Link from "next/link";
import Image from "next/image";
import { CheckCircle, XCircle, Clock } from "lucide-react";

function ConfirmacionContent() {
  const params = useSearchParams();
  const status = params.get("status");
  const orderId = params.get("order");

  const isSuccess = status === "success" || status === "approved";
  const isFailure = status === "failure" || status === "rejected";

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 text-center">
      <div className="max-w-sm w-full">
        <Link href="/" className="flex justify-center mb-8">
          <Image src="/logo.png" alt="BROT.74" width={72} height={72} className="object-contain" />
        </Link>

        <div className="bg-white rounded-3xl border-2 border-border p-8 shadow-sm">
          {isSuccess ? (
            <>
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <h2 className="font-serif text-2xl font-bold text-brown mb-2">¡Pedido confirmado!</h2>
              <p className="text-muted text-sm leading-relaxed mb-2">
                Tu pago fue procesado con éxito.
              </p>
              {orderId && (
                <p className="text-xs text-muted/70 mb-6">Pedido #{orderId}</p>
              )}
              <p className="text-sm text-brown/80 bg-amber/10 rounded-xl p-3">
                Te vamos a avisar por WhatsApp cuando tu pan esté listo. 🍞
              </p>
            </>
          ) : isFailure ? (
            <>
              <XCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
              <h2 className="font-serif text-2xl font-bold text-brown mb-2">Pago no completado</h2>
              <p className="text-muted text-sm leading-relaxed mb-6">
                Hubo un problema con el pago. Podés intentarlo de nuevo o contactarnos por WhatsApp.
              </p>
            </>
          ) : (
            <>
              <Clock className="w-16 h-16 text-amber mx-auto mb-4" />
              <h2 className="font-serif text-2xl font-bold text-brown mb-2">Pedido recibido</h2>
              <p className="text-muted text-sm leading-relaxed mb-2">
                Recibimos tu pedido. El pago está siendo procesado.
              </p>
              {orderId && (
                <p className="text-xs text-muted/70 mb-6">Pedido #{orderId}</p>
              )}
              <p className="text-sm text-brown/80 bg-amber/10 rounded-xl p-3">
                Nos vamos a comunicar por WhatsApp para coordinar. 🍞
              </p>
            </>
          )}

          <div className="mt-6">
            <Link
              href="/"
              className="block w-full bg-brown text-cream py-3 rounded-xl font-semibold text-sm hover:bg-charcoal transition-colors"
            >
              Volver al inicio
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ConfirmacionPage() {
  return (
    <Suspense>
      <ConfirmacionContent />
    </Suspense>
  );
}
