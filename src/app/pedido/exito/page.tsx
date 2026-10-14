import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { VaciarCarrito } from "@/components/VaciarCarrito";
import { formatearCOP } from "@/lib/formato";
import { consultarPago, type PagoConsultado } from "@/lib/mercadopago";
import { etiquetaEstado } from "@/lib/pedido";

export const metadata: Metadata = {
  title: "Resultado del pago — Toolshop",
};

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default function PedidoExitoPage({ searchParams }: Props) {
  return (
    <section aria-labelledby="titulo-resultado" className="max-w-xl">
      <Suspense
        fallback={
          <p role="status" className="text-gray-600">
            Consultando el pago en Mercado Pago…
          </p>
        }
      >
        <ResultadoPago searchParams={searchParams} />
      </Suspense>
    </section>
  );
}

async function ResultadoPago({ searchParams }: Props) {
  // El SDK genera valores aleatorios (UUID) en cada llamada: esta parte se renderiza por solicitud.
  await connection();
  const parametros = await searchParams;
  const paymentId = [parametros.payment_id, parametros.collection_id]
    .flat()
    .find((valor) => valor && valor !== "null");

  let pago: PagoConsultado | null = null;
  if (paymentId) {
    try {
      pago = await consultarPago(paymentId);
    } catch (error) {
      console.error("[pedido/exito] no se pudo consultar el pago", {
        pago: paymentId,
        mensaje: error instanceof Error ? error.message : String(error),
      });
    }
  }

  if (!pago) {
    return (
      <>
        <h1 id="titulo-resultado" className="mb-4 text-2xl font-bold">
          No pudimos confirmar el pago
        </h1>
        <p role="alert" data-testid="payment-unconfirmed" className="mb-6 rounded-md bg-yellow-50 p-3 text-yellow-900">
          No encontramos la información del pago. Si se descontó dinero de tu cuenta de prueba,
          revisa la actividad en Mercado Pago.
        </p>
        <Link href="/carrito" data-testid="back-to-cart" className="font-medium text-blue-700 underline">
          Volver al carrito
        </Link>
      </>
    );
  }

  const aprobado = pago.status === "approved";

  return (
    <>
      {aprobado && <VaciarCarrito />}
      <h1 id="titulo-resultado" className="mb-4 text-2xl font-bold">
        {aprobado ? "¡Gracias por tu compra!" : "Tu pago no está aprobado"}
      </h1>
      <dl className="mb-6 space-y-2 rounded-lg border border-gray-200 bg-white p-4">
        <div className="flex justify-between gap-4">
          <dt>Número de pedido</dt>
          <dd data-testid="order-reference" className="font-mono">
            {pago.externalReference ?? "—"}
          </dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt>Estado</dt>
          <dd data-testid="order-status">{etiquetaEstado(pago.status)}</dd>
        </div>
        <div className="flex justify-between gap-4 text-lg font-bold">
          <dt>Total pagado</dt>
          <dd data-testid="order-total">
            {pago.amount !== undefined ? formatearCOP(pago.amount) : "—"}
          </dd>
        </div>
      </dl>
      {aprobado ? (
        <Link href="/" className="font-medium text-blue-700 underline">
          Seguir comprando
        </Link>
      ) : (
        <Link href="/carrito" data-testid="back-to-cart" className="font-medium text-blue-700 underline">
          Volver al carrito
        </Link>
      )}
    </>
  );
}
