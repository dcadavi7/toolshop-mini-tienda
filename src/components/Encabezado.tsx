"use client";

import Link from "next/link";
import { useCarrito } from "@/components/CarritoProvider";

export function Encabezado() {
  const { unidades, listo } = useCarrito();
  const cantidad = listo ? unidades : 0;

  return (
    <header className="border-b border-gray-200 bg-white">
      <nav
        aria-label="Principal"
        className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4"
      >
        <Link href="/" className="text-xl font-bold text-gray-900">
          Toolshop
        </Link>
        <Link
          href="/carrito"
          className="rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-gray-900 hover:bg-gray-50"
          aria-label={`Carrito, ${cantidad} ${cantidad === 1 ? "unidad" : "unidades"}`}
        >
          Carrito (<span data-testid="cart-count">{cantidad}</span>)
        </Link>
      </nav>
    </header>
  );
}
