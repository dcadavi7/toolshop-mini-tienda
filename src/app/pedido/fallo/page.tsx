import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Pago no completado — Toolshop",
};

export default function PedidoFalloPage() {
  return (
    <section aria-labelledby="titulo-fallo" className="max-w-xl">
      <h1 id="titulo-fallo" className="mb-4 text-2xl font-bold">
        El pago no se completó
      </h1>
      <p role="alert" data-testid="payment-failed" className="mb-6 rounded-md bg-red-50 p-3 text-red-800">
        Mercado Pago rechazó el pago o quedó pendiente. Tu carrito sigue intacto, así que puedes
        intentarlo de nuevo con otro medio de pago.
      </p>
      <Link
        href="/carrito"
        data-testid="back-to-cart"
        className="inline-block rounded-md bg-blue-700 px-6 py-3 font-medium text-white hover:bg-blue-800"
      >
        Volver al carrito
      </Link>
    </section>
  );
}
