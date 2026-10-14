"use client";

import { useState } from "react";
import { useCarrito } from "@/components/CarritoProvider";

type Props = {
  productId: string;
  nombre: string;
  agotado: boolean;
};

export function BotonAgregar({ productId, nombre, agotado }: Props) {
  const { agregar, listo } = useCarrito();
  const [mensaje, setMensaje] = useState("");

  if (agotado) {
    return (
      <button
        type="button"
        disabled
        data-testid={`add-to-cart-${productId}`}
        className="w-full cursor-not-allowed rounded-md bg-gray-200 px-4 py-2 text-sm font-medium text-gray-500"
      >
        Agotado
      </button>
    );
  }

  return (
    <div>
      <button
        type="button"
        disabled={!listo}
        data-testid={`add-to-cart-${productId}`}
        aria-label={`Agregar ${nombre} al carrito`}
        onClick={() => {
          agregar(productId);
          setMensaje(`${nombre} agregado al carrito`);
        }}
        className="w-full rounded-md bg-blue-700 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800 disabled:opacity-60"
      >
        Agregar
      </button>
      <p role="status" className="mt-2 min-h-5 text-xs text-green-700">
        {mensaje}
      </p>
    </div>
  );
}
