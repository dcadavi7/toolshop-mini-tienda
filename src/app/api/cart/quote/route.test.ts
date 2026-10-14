import { describe, expect, it } from "vitest";
import { POST } from "./route";

async function cotizar(cuerpo: unknown) {
  const request = new Request("http://localhost/api/cart/quote", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body:
      typeof cuerpo === "string" ? cuerpo : JSON.stringify(cuerpo),
  });
  const respuesta = await POST(request);
  return {
    status: respuesta.status,
    body: await respuesta.json(),
  };
}

describe("POST /api/cart/quote", () => {
  it("devuelve la cotización con los campos de la spec", async () => {
    const { status, body } = await cotizar({
      items: [{ productId: "claw-hammer", quantity: 2 }],
    });

    expect(status).toBe(200);
    expect(body).toEqual({
      lines: [
        {
          productId: "claw-hammer",
          name: "Martillo de uña",
          unitPrice: 63900,
          quantity: 2,
          lineTotal: 127800,
          eco: true,
        },
      ],
      subtotal: 127800,
      ecoDiscount: 6390,
      total: 121410,
    });
  });

  it("responde 400 si el cuerpo no es JSON válido", async () => {
    const { status, body } = await cotizar("{");

    expect(status).toBe(400);
    expect(body).toEqual({ error: "El cuerpo de la solicitud no es válido" });
  });

  it("responde 400 si falta items", async () => {
    const { status, body } = await cotizar({});

    expect(status).toBe(400);
    expect(body).toEqual({ error: "El cuerpo de la solicitud no es válido" });
  });

  it("responde 400 si items está vacío", async () => {
    const { status, body } = await cotizar({ items: [] });

    expect(status).toBe(400);
    expect(body).toEqual({ error: "La lista de productos está vacía" });
  });

  it("responde 400 si el productId no existe", async () => {
    const { status, body } = await cotizar({
      items: [{ productId: "no-existe", quantity: 1 }],
    });

    expect(status).toBe(400);
    expect(body).toEqual({ error: "El producto no existe" });
  });

  it("responde 400 si la cantidad no es entera", async () => {
    const { status, body } = await cotizar({
      items: [{ productId: "claw-hammer", quantity: 1.5 }],
    });

    expect(status).toBe(400);
    expect(body).toEqual({
      error: "La cantidad debe ser un entero entre 1 y 99",
    });
  });

  it("responde 400 si la cantidad está fuera de 1–99", async () => {
    const cero = await cotizar({
      items: [{ productId: "claw-hammer", quantity: 0 }],
    });
    const cien = await cotizar({
      items: [{ productId: "claw-hammer", quantity: 100 }],
    });

    expect(cero.status).toBe(400);
    expect(cero.body).toEqual({
      error: "La cantidad debe ser un entero entre 1 y 99",
    });
    expect(cien.status).toBe(400);
    expect(cien.body).toEqual({
      error: "La cantidad debe ser un entero entre 1 y 99",
    });
  });

  it("responde 400 si el productId está repetido", async () => {
    const { status, body } = await cotizar({
      items: [
        { productId: "claw-hammer", quantity: 50 },
        { productId: "claw-hammer", quantity: 50 },
      ],
    });

    expect(status).toBe(400);
    expect(body).toEqual({ error: "El producto está repetido en el carrito" });
  });

  it("responde 400 si el producto está agotado", async () => {
    const { status, body } = await cotizar({
      items: [{ productId: "long-nose-pliers", quantity: 1 }],
    });

    expect(status).toBe(400);
    expect(body).toEqual({ error: "El producto está agotado" });
  });
});
