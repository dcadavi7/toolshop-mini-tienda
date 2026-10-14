import { describe, expect, it } from "vitest";
import { parsearCarrito } from "./carritoStore";

describe("parsearCarrito", () => {
  it("devuelve un carrito vacío si no hay nada guardado o el JSON no es válido", () => {
    expect(parsearCarrito(null)).toEqual([]);
    expect(parsearCarrito("no es json")).toEqual([]);
    expect(parsearCarrito('{"productId":"claw-hammer"}')).toEqual([]);
  });

  it("conserva solo las entradas válidas", () => {
    const raw = JSON.stringify([
      { productId: "claw-hammer", quantity: 2 },
      { productId: "tape-measure", quantity: 0 },
      { productId: "wood-saw", quantity: 2.5 },
      { productId: 7, quantity: 1 },
      { productId: "claw-hammer", quantity: 4 },
      null,
    ]);
    expect(parsearCarrito(raw)).toEqual([
      { productId: "claw-hammer", quantity: 2 },
    ]);
  });
});
