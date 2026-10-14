export type Co2Rating = "A" | "B" | "C" | "D" | "E";

export type Producto = {
  id: string;
  nombre: string;
  precio: number;
  existencias: number;
  co2Rating: Co2Rating;
};

export type ItemCarrito = {
  productId: string;
  quantity: number;
};

export const CANTIDAD_MINIMA = 1;
export const CANTIDAD_MAXIMA = 99;

export class ProductoAgotadoError extends Error {
  readonly productId: string;

  constructor(productId: string) {
    super("El producto está agotado");
    this.name = "ProductoAgotadoError";
    this.productId = productId;
  }
}

export function esEcologico(producto: Pick<Producto, "co2Rating">): boolean {
  return producto.co2Rating === "A" || producto.co2Rating === "B";
}

export function estaAgotado(producto: Pick<Producto, "existencias">): boolean {
  return producto.existencias <= 0;
}

/** Ajusta un valor fuera de rango al límite más cercano (1–99). */
export function ajustarCantidad(cantidad: number): number {
  if (!Number.isFinite(cantidad)) {
    return CANTIDAD_MINIMA;
  }

  const entero = Math.floor(cantidad);

  if (entero < CANTIDAD_MINIMA) {
    return CANTIDAD_MINIMA;
  }
  if (entero > CANTIDAD_MAXIMA) {
    return CANTIDAD_MAXIMA;
  }
  return entero;
}

export function subtotalLinea(precio: number, cantidad: number): number {
  return precio * cantidad;
}

export function productoPorId(
  catalogo: Producto[],
  productId: string,
): Producto | undefined {
  return catalogo.find((item) => item.id === productId);
}

function buscarProducto(catalogo: Producto[], productId: string): Producto {
  const producto = productoPorId(catalogo, productId);
  if (!producto) {
    throw new Error(`El producto no existe`);
  }
  return producto;
}

/**
 * Agrega un producto al carrito. Si ya existe la línea, suma la cantidad.
 * La cantidad resultante se ajusta al rango 1–99.
 */
export function agregarProducto(
  items: ItemCarrito[],
  productId: string,
  cantidad: number,
  catalogo: Producto[],
): ItemCarrito[] {
  const producto = buscarProducto(catalogo, productId);
  if (estaAgotado(producto)) {
    throw new ProductoAgotadoError(productId);
  }

  const cantidadAjustada = ajustarCantidad(cantidad);
  const existente = items.find((item) => item.productId === productId);

  if (existente) {
    const quantity = ajustarCantidad(existente.quantity + cantidadAjustada);
    return items.map((item) =>
      item.productId === productId ? { ...item, quantity } : item,
    );
  }

  return [...items, { productId, quantity: cantidadAjustada }];
}

export function subtotalCarrito(
  items: ItemCarrito[],
  catalogo: Producto[],
): number {
  return items.reduce((acum, item) => {
    const producto = buscarProducto(catalogo, item.productId);
    return acum + subtotalLinea(producto.precio, item.quantity);
  }, 0);
}

function unidadesTotales(items: ItemCarrito[]): number {
  return items.reduce((acum, item) => acum + item.quantity, 0);
}

function unidadesEcologicas(
  items: ItemCarrito[],
  catalogo: Producto[],
): number {
  return items.reduce((acum, item) => {
    const producto = buscarProducto(catalogo, item.productId);
    return acum + (esEcologico(producto) ? item.quantity : 0);
  }, 0);
}

/** 5 % redondeado al peso entero más cercano (mitades hacia arriba). */
export function cincoPorCientoAlPeso(subtotal: number): number {
  const producto = subtotal * 5;
  const entero = Math.trunc(producto / 100);
  const resto = producto % 100;
  return resto >= 50 ? entero + 1 : entero;
}

/**
 * Descuento ecológico: 5 % del subtotal si más del 50 % de las unidades son
 * ecológicas. Exactamente 50 % no da descuento.
 */
export function descuentoEcologico(
  items: ItemCarrito[],
  catalogo: Producto[],
): number {
  const totalUnidades = unidadesTotales(items);
  if (totalUnidades === 0) {
    return 0;
  }

  const ecoUnidades = unidadesEcologicas(items, catalogo);
  if (ecoUnidades * 2 <= totalUnidades) {
    return 0;
  }

  return cincoPorCientoAlPeso(subtotalCarrito(items, catalogo));
}

export function totalCarrito(
  items: ItemCarrito[],
  catalogo: Producto[],
): number {
  return subtotalCarrito(items, catalogo) - descuentoEcologico(items, catalogo);
}

export type LineaCotizacion = {
  productId: string;
  name: string;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
  eco: boolean;
};

export type Cotizacion = {
  lines: LineaCotizacion[];
  subtotal: number;
  ecoDiscount: number;
  total: number;
};

export type ResultadoValidacion =
  | { ok: true; items: ItemCarrito[] }
  | { ok: false; error: string };

function esObjeto(valor: unknown): valor is Record<string, unknown> {
  return typeof valor === "object" && valor !== null && !Array.isArray(valor);
}

export function validarItemsCotizacion(
  cuerpo: unknown,
  catalogo: Producto[],
): ResultadoValidacion {
  if (!esObjeto(cuerpo) || !("items" in cuerpo) || !Array.isArray(cuerpo.items)) {
    return { ok: false, error: "El cuerpo de la solicitud no es válido" };
  }

  if (cuerpo.items.length === 0) {
    return { ok: false, error: "La lista de productos está vacía" };
  }

  const items: ItemCarrito[] = [];
  const vistos = new Set<string>();

  for (const item of cuerpo.items) {
    if (!esObjeto(item) || typeof item.productId !== "string") {
      return { ok: false, error: "El cuerpo de la solicitud no es válido" };
    }

    const { productId, quantity } = item;

    if (vistos.has(productId)) {
      return { ok: false, error: "El producto está repetido en el carrito" };
    }
    vistos.add(productId);

    if (typeof quantity !== "number" || !Number.isFinite(quantity)) {
      return { ok: false, error: "El cuerpo de la solicitud no es válido" };
    }

    if (
      !Number.isInteger(quantity) ||
      quantity < CANTIDAD_MINIMA ||
      quantity > CANTIDAD_MAXIMA
    ) {
      return {
        ok: false,
        error: "La cantidad debe ser un entero entre 1 y 99",
      };
    }

    const producto = productoPorId(catalogo, productId);
    if (!producto) {
      return { ok: false, error: "El producto no existe" };
    }

    if (estaAgotado(producto)) {
      return { ok: false, error: "El producto está agotado" };
    }

    items.push({ productId, quantity });
  }

  return { ok: true, items };
}

export function cotizarCarrito(
  items: ItemCarrito[],
  catalogo: Producto[],
): Cotizacion {
  const lines = items.map((item) => {
    const producto = buscarProducto(catalogo, item.productId);
    return {
      productId: item.productId,
      name: producto.nombre,
      unitPrice: producto.precio,
      quantity: item.quantity,
      lineTotal: subtotalLinea(producto.precio, item.quantity),
      eco: esEcologico(producto),
    };
  });

  const subtotal = subtotalCarrito(items, catalogo);
  const ecoDiscount = descuentoEcologico(items, catalogo);

  return {
    lines,
    subtotal,
    ecoDiscount,
    total: subtotal - ecoDiscount,
  };
}

/**
 * Cambia la cantidad de una línea existente, ajustada al rango 1–99.
 * Si el producto no está en el carrito, devuelve los ítems sin cambios.
 */
export function cambiarCantidad(
  items: ItemCarrito[],
  productId: string,
  cantidad: number,
): ItemCarrito[] {
  if (!items.some((item) => item.productId === productId)) {
    return items;
  }
  const quantity = ajustarCantidad(cantidad);
  return items.map((item) =>
    item.productId === productId ? { ...item, quantity } : item,
  );
}

/** Elimina la línea del producto; si no está, devuelve los ítems sin cambios. */
export function eliminarProducto(
  items: ItemCarrito[],
  productId: string,
): ItemCarrito[] {
  return items.filter((item) => item.productId !== productId);
}

/** Cantidad total de unidades en el carrito (para el contador del encabezado). */
export function contarUnidades(items: ItemCarrito[]): number {
  return items.reduce((acum, item) => acum + item.quantity, 0);
}
