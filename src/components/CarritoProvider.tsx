"use client";

import { createContext, useCallback, useContext, useMemo, useSyncExternalStore } from "react";
import catalogoJson from "@/data/products.json";
import {
  agregarProducto,
  cambiarCantidad,
  contarUnidades,
  eliminarProducto,
  type ItemCarrito,
  type Producto,
} from "@/lib/carrito";
import {
  guardarCarrito,
  leerCarrito,
  leerCarritoServidor,
  suscribirCarrito,
} from "@/lib/carritoStore";

const catalogo = catalogoJson as Producto[];

type ContextoCarrito = {
  items: ItemCarrito[];
  unidades: number;
  /** false durante el render del servidor y la hidratación; true cuando ya se leyó localStorage. */
  listo: boolean;
  agregar: (productId: string) => void;
  cambiar: (productId: string, cantidad: number) => void;
  eliminar: (productId: string) => void;
  vaciar: () => void;
};

const Contexto = createContext<ContextoCarrito | null>(null);

const sinSuscripcion = () => () => {};

export function CarritoProvider({ children }: { children: React.ReactNode }) {
  const items = useSyncExternalStore(suscribirCarrito, leerCarrito, leerCarritoServidor);
  const listo = useSyncExternalStore(
    sinSuscripcion,
    () => true,
    () => false,
  );

  const agregar = useCallback((productId: string) => {
    guardarCarrito(agregarProducto(leerCarrito(), productId, 1, catalogo));
  }, []);

  const cambiar = useCallback((productId: string, cantidad: number) => {
    guardarCarrito(cambiarCantidad(leerCarrito(), productId, cantidad));
  }, []);

  const eliminar = useCallback((productId: string) => {
    guardarCarrito(eliminarProducto(leerCarrito(), productId));
  }, []);

  const vaciar = useCallback(() => guardarCarrito([]), []);

  const valor = useMemo(
    () => ({
      items,
      unidades: contarUnidades(items),
      listo,
      agregar,
      cambiar,
      eliminar,
      vaciar,
    }),
    [items, listo, agregar, cambiar, eliminar, vaciar],
  );

  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export function useCarrito(): ContextoCarrito {
  const contexto = useContext(Contexto);
  if (!contexto) {
    throw new Error("useCarrito debe usarse dentro de CarritoProvider");
  }
  return contexto;
}
