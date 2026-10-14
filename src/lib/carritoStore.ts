import {
  CANTIDAD_MAXIMA,
  CANTIDAD_MINIMA,
  type ItemCarrito,
} from "@/lib/carrito";

export const CLAVE_CARRITO = "toolshop-carrito";
const EVENTO_CAMBIO = "toolshop-carrito-cambio";
const VACIO: ItemCarrito[] = [];

/**
 * Convierte lo guardado en localStorage en ítems válidos. Descarta JSON
 * inválido, entradas mal formadas, cantidades fuera de 1–99 y productos repetidos.
 */
export function parsearCarrito(raw: string | null): ItemCarrito[] {
  if (!raw) {
    return VACIO;
  }
  let datos: unknown;
  try {
    datos = JSON.parse(raw);
  } catch {
    return VACIO;
  }
  if (!Array.isArray(datos)) {
    return VACIO;
  }
  const vistos = new Set<string>();
  const items: ItemCarrito[] = [];
  for (const entrada of datos) {
    if (typeof entrada !== "object" || entrada === null) continue;
    const { productId, quantity } = entrada as Record<string, unknown>;
    if (typeof productId !== "string" || vistos.has(productId)) continue;
    if (
      typeof quantity !== "number" ||
      !Number.isInteger(quantity) ||
      quantity < CANTIDAD_MINIMA ||
      quantity > CANTIDAD_MAXIMA
    ) {
      continue;
    }
    vistos.add(productId);
    items.push({ productId, quantity });
  }
  return items;
}

let ultimoRaw: string | null = null;
let ultimoValor: ItemCarrito[] = VACIO;

function leerRaw(): string | null {
  try {
    return window.localStorage.getItem(CLAVE_CARRITO);
  } catch {
    return null;
  }
}

/** Snapshot estable para useSyncExternalStore: solo cambia si cambió el texto guardado. */
export function leerCarrito(): ItemCarrito[] {
  const raw = leerRaw();
  if (raw !== ultimoRaw) {
    ultimoRaw = raw;
    ultimoValor = parsearCarrito(raw);
  }
  return ultimoValor;
}

export function leerCarritoServidor(): ItemCarrito[] {
  return VACIO;
}

export function guardarCarrito(items: ItemCarrito[]): void {
  try {
    if (items.length === 0) {
      window.localStorage.removeItem(CLAVE_CARRITO);
    } else {
      window.localStorage.setItem(CLAVE_CARRITO, JSON.stringify(items));
    }
  } catch {
    // Sin almacenamiento disponible: el carrito vive solo en esta pestaña.
  }
  window.dispatchEvent(new Event(EVENTO_CAMBIO));
}

export function suscribirCarrito(alCambiar: () => void): () => void {
  const alStorage = (evento: StorageEvent) => {
    if (evento.key === null || evento.key === CLAVE_CARRITO) alCambiar();
  };
  window.addEventListener(EVENTO_CAMBIO, alCambiar);
  window.addEventListener("storage", alStorage);
  return () => {
    window.removeEventListener(EVENTO_CAMBIO, alCambiar);
    window.removeEventListener("storage", alStorage);
  };
}
