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

function buscarProducto(catalogo: Producto[], productId: string): Producto {
  const producto = catalogo.find((item) => item.id === productId);
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
