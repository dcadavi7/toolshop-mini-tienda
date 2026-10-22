"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useCarrito } from "@/components/CarritoProvider";
import type { Cotizacion } from "@/lib/carrito";
import { formatearCOP } from "@/lib/formato";

type Resultado =
  | { clave: string; ok: true; cotizacion: Cotizacion }
  | { clave: string; ok: false; error: string };

export function VistaCarrito() {
  const { items, listo, cambiar, eliminar } = useCarrito();
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const [pagando, setPagando] = useState(false);
  const [errorPago, setErrorPago] = useState<string | null>(null);
  const clave = JSON.stringify(items);

  useEffect(() => {
    if (!listo || items.length === 0) return;
    const controlador = new AbortController();
    fetch("/api/cart/quote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items }),
      signal: controlador.signal,
    })
      .then(async (respuesta) => {
        const datos = await respuesta.json();
        setResultado(
          respuesta.ok
            ? { clave, ok: true, cotizacion: datos as Cotizacion }
            : { clave, ok: false, error: datos.error ?? "No se pudo calcular el total" },
        );
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setResultado({ clave, ok: false, error: "No se pudo calcular el total" });
      });
    return () => controlador.abort();
  }, [clave, items, listo]);

  useEffect(() => {
    // Si el usuario vuelve con "Atrás" desde Mercado Pago, el botón no debe quedar bloqueado.
    const alMostrar = (evento: PageTransitionEvent) => {
      if (evento.persisted) setPagando(false);
    };
    window.addEventListener("pageshow", alMostrar);
    return () => window.removeEventListener("pageshow", alMostrar);
  }, []);

  if (!listo) {
    return (
      <p role="status" className="text-gray-600">
        Cargando carrito…
      </p>
    );
  }

  if (items.length === 0) {
    return (
      <section aria-labelledby="titulo-carrito">
        <h1 id="titulo-carrito" className="mb-4 text-2xl font-bold">
          Tu carrito
        </h1>
        <div data-testid="cart-empty" className="rounded-lg border border-gray-200 bg-white p-6">
          <p className="mb-4">Tu carrito está vacío.</p>
          <Link href="/" className="font-medium text-blue-700 underline">
            Ver el catálogo
          </Link>
        </div>
      </section>
    );
  }

  const vigente = resultado?.clave === clave ? resultado : null;
  const calculando = vigente === null;
  const cotizacion = vigente?.ok ? vigente.cotizacion : null;
  async function pagar() {
    setPagando(true);
    setErrorPago(null);
    try {
      const respuesta = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
      });
      const datos = await respuesta.json();
      if (!respuesta.ok || typeof datos.checkoutUrl !== "string") {
        throw new Error(datos.error ?? "No se pudo iniciar el pago");
      }
      window.location.assign(datos.checkoutUrl);
    } catch (error) {
      setErrorPago(error instanceof Error ? error.message : "No se pudo iniciar el pago");
      setPagando(false);
    }
  }

  const lineaPorId = new Map(cotizacion?.lines.map((linea) => [linea.productId, linea]));

  return (
    <section aria-labelledby="titulo-carrito">
      <h1 id="titulo-carrito" className="mb-6 text-2xl font-bold">
        Tu carrito
      </h1>

      <dl className="ml-auto mb-6 max-w-sm space-y-2 rounded-lg border border-gray-200 bg-white p-4">
        <div className="flex justify-between">
          <dt>Subtotal</dt>
          <dd data-testid="cart-subtotal">{cotizacion ? formatearCOP(cotizacion.subtotal) : "…"}</dd>
        </div>
        <div className="flex justify-between text-green-800">
          <dt>Descuento ecológico</dt>
          <dd data-testid="cart-eco-discount">
            {cotizacion ? `-${formatearCOP(cotizacion.ecoDiscount)}` : "…"}
          </dd>
        </div>
        <div className="flex justify-between border-t border-gray-200 pt-2 text-lg font-bold">
          <dt>Total</dt>
          <dd data-testid="cart-total">{cotizacion ? formatearCOP(cotizacion.total) : "…"}</dd>
        </div>
      </dl>

      <div className="flex justify-end">
        <button
          type="button"
          data-testid="pay-button"
          disabled={calculando || !cotizacion || pagando}
          aria-busy={calculando || pagando}
          onClick={pagar}
          className="rounded-md bg-blue-700 px-6 py-3 font-medium text-white hover:bg-blue-800 disabled:opacity-60"
        >
          {pagando ? "Redirigiendo a Mercado Pago…" : calculando ? "Calculando…" : "Ir a pagar"}
        </button>
      </div>
      <ul className="mb-6 divide-y divide-gray-200 rounded-lg border border-gray-200 bg-white">
        {items.map((item) => {
          const linea = lineaPorId.get(item.productId);
          const nombre = linea?.name ?? item.productId;
          const idInput = `cantidad-${item.productId}`;
          return (
            <li
              key={item.productId}
              data-testid={`cart-line-${item.productId}`}
              className="flex flex-wrap items-center gap-4 p-4"
            >
              <div className="min-w-48 flex-1">
                <p className="font-semibold">{nombre}</p>
                {linea && (
                  <p className="text-sm text-gray-600">{formatearCOP(linea.unitPrice)} c/u</p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <label htmlFor={idInput} className="text-sm">
                  Cantidad
                </label>
                <input
                  id={idInput}
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={99}
                  value={item.quantity}
                  data-testid={`qty-input-${item.productId}`}
                  aria-label={`Cantidad de ${nombre}`}
                  onChange={(evento) => cambiar(item.productId, Number(evento.target.value))}
                  className="w-20 rounded-md border border-gray-300 px-2 py-1"
                />
              </div>
              <p className="w-32 text-right font-medium">
                {linea ? formatearCOP(linea.lineTotal) : "…"}
              </p>
              <button
                type="button"
                data-testid={`remove-${item.productId}`}
                aria-label={`Eliminar ${nombre} del carrito`}
                onClick={() => eliminar(item.productId)}
                className="rounded-md border border-gray-300 px-3 py-1 text-sm hover:bg-gray-50"
              >
                Eliminar
              </button>
            </li>
          );
        })}
      </ul>

      {errorPago && (
        <p role="alert" data-testid="checkout-error" className="mb-4 rounded-md bg-red-50 p-3 text-red-800">
          {errorPago}
        </p>
      )}

      {vigente && !vigente.ok && (
        <p role="alert" data-testid="cart-error" className="mb-4 rounded-md bg-red-50 p-3 text-red-800">
          {vigente.error}
        </p>
      )}

    </section>
  );
}
