import { describe, expect, it } from "vitest";
import catalogoJson from "@/data/products.json";
import {
  agregarProducto,
  ajustarCantidad,
  cincoPorCientoAlPeso,
  descuentoEcologico,
  esEcologico,
  estaAgotado,
  ProductoAgotadoError,
  subtotalCarrito,
  subtotalLinea,
  totalCarrito,
  type Producto,
} from "./carrito";

const catalogo = catalogoJson as Producto[];

function producto(id: string): Producto {
  const encontrado = catalogo.find((item) => item.id === id);
  if (!encontrado) {
    throw new Error(`Falta el producto ${id} en el catálogo`);
  }
  return encontrado;
}

describe("catálogo", () => {
  it("marca como ecológicos los ratings A y B", () => {
    expect(esEcologico(producto("tape-measure"))).toBe(true);
    expect(esEcologico(producto("claw-hammer"))).toBe(true);
    expect(esEcologico(producto("bolt-cutters"))).toBe(false);
    expect(esEcologico(producto("thor-hammer"))).toBe(false);
  });

  it("marca agotado el producto con existencias 0", () => {
    expect(estaAgotado(producto("long-nose-pliers"))).toBe(true);
    expect(estaAgotado(producto("claw-hammer"))).toBe(false);
  });
});

describe("agregarProducto", () => {
  it("suma la cantidad si el producto ya está en el carrito", () => {
    const inicial = agregarProducto([], "claw-hammer", 2, catalogo);
    const actualizado = agregarProducto(inicial, "claw-hammer", 3, catalogo);

    expect(actualizado).toEqual([{ productId: "claw-hammer", quantity: 5 }]);
  });

  it("lanza ProductoAgotadoError si el producto está agotado", () => {
    expect(() =>
      agregarProducto([], "long-nose-pliers", 1, catalogo),
    ).toThrow(ProductoAgotadoError);
  });

  it("ajusta a 99 si al sumar sobre una línea existente se supera el máximo", () => {
    const inicial = agregarProducto([], "claw-hammer", 98, catalogo);
    const actualizado = agregarProducto(inicial, "claw-hammer", 5, catalogo);

    expect(actualizado).toEqual([{ productId: "claw-hammer", quantity: 99 }]);
  });

  it("lanza si el productId no existe", () => {
    expect(() => agregarProducto([], "no-existe", 1, catalogo)).toThrow(
      "El producto no existe",
    );
  });
});

describe("subtotales", () => {
  it("calcula el subtotal de línea como precio × cantidad", () => {
    expect(subtotalLinea(63900, 2)).toBe(127800);
  });

  it("calcula el subtotal del carrito como suma de subtotales de línea", () => {
    const items = [
      { productId: "claw-hammer", quantity: 2 },
      { productId: "tape-measure", quantity: 1 },
    ];

    expect(subtotalCarrito(items, catalogo)).toBe(127800 + 29900);
  });
});

describe("ajustarCantidad", () => {
  it("acepta los límites 1 y 99", () => {
    expect(ajustarCantidad(1)).toBe(1);
    expect(ajustarCantidad(99)).toBe(99);
  });

  it("ajusta 0 a 1 y 100 a 99", () => {
    expect(ajustarCantidad(0)).toBe(1);
    expect(ajustarCantidad(100)).toBe(99);
  });

  it("devuelve el mínimo si el valor no es un número finito", () => {
    expect(ajustarCantidad(Number.NaN)).toBe(1);
    expect(ajustarCantidad(Number.POSITIVE_INFINITY)).toBe(1);
    expect(ajustarCantidad(Number.NEGATIVE_INFINITY)).toBe(1);
  });

  it("trunca los decimales hacia abajo antes de aplicar los límites", () => {
    expect(ajustarCantidad(1.9)).toBe(1);
    expect(ajustarCantidad(99.9)).toBe(99);
    expect(ajustarCantidad(0.9)).toBe(1);
  });
});

describe("descuento ecológico", () => {
  it("no aplica descuento si exactamente el 50 % de las unidades son ecológicas", () => {
    const items = [
      { productId: "tape-measure", quantity: 1 },
      { productId: "bolt-cutters", quantity: 1 },
    ];

    expect(descuentoEcologico(items, catalogo)).toBe(0);
    expect(totalCarrito(items, catalogo)).toBe(
      subtotalCarrito(items, catalogo),
    );
  });

  it("aplica 5 % si más del 50 % de las unidades son ecológicas (51 %)", () => {
    const items = [
      { productId: "tape-measure", quantity: 51 },
      { productId: "bolt-cutters", quantity: 49 },
    ];

    const subtotal = subtotalCarrito(items, catalogo);
    const descuento = descuentoEcologico(items, catalogo);

    expect(descuento).toBe(cincoPorCientoAlPeso(subtotal));
    expect(descuento).toBeGreaterThan(0);
    expect(totalCarrito(items, catalogo)).toBe(subtotal - descuento);
  });

  it("redondea el 5 % al peso más cercano, mitades hacia arriba", () => {
    expect(cincoPorCientoAlPeso(10)).toBe(1);
    expect(cincoPorCientoAlPeso(5)).toBe(0);
    expect(cincoPorCientoAlPeso(15)).toBe(1);
    expect(cincoPorCientoAlPeso(20)).toBe(1);
    expect(cincoPorCientoAlPeso(30)).toBe(2);
  });

  it("usa el redondeo al calcular el descuento ecológico", () => {
    const catalogoSintetico: Producto[] = [
      {
        id: "eco-diez",
        nombre: "Eco diez",
        precio: 10,
        existencias: 10,
        co2Rating: "A",
      },
    ];
    const items = [{ productId: "eco-diez", quantity: 1 }];

    expect(descuentoEcologico(items, catalogoSintetico)).toBe(1);
    expect(totalCarrito(items, catalogoSintetico)).toBe(9);
  });
});
