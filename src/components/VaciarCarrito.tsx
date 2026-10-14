"use client";

import { useEffect } from "react";
import { useCarrito } from "@/components/CarritoProvider";

/** Vacía el carrito una sola vez cuando se muestra un pago aprobado. */
export function VaciarCarrito() {
  const { vaciar, listo } = useCarrito();
  useEffect(() => {
    if (listo) vaciar();
  }, [listo, vaciar]);
  return null;
}
