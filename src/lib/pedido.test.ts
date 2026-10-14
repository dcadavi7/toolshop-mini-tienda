import { describe, expect, it } from "vitest";
import type { Cotizacion } from "./carrito";
import { construirPreferencia, etiquetaEstado, generarReferencia } from "./pedido";

const cotizacion: Cotizacion = {
  lines: [
    { productId: "claw-hammer", name: "Martillo de uña", unitPrice: 63900, quantity: 2, lineTotal: 127800, eco: true },
  ],
  subtotal: 127800,
  ecoDiscount: 6390,
  total: 121410,
};

describe("generarReferencia", () => {
  it("usa el formato TS-fecha-aleatorio", () => {
    const ref = generarReferencia(new Date("2026-10-14T15:04:05Z"), "abcdef12-3456");
    expect(ref).toBe("TS-20261014150405-ABCDEF");
  });

  it("genera referencias distintas en llamadas seguidas", () => {
    expect(generarReferencia()).not.toBe(generarReferencia());
  });
});

describe("construirPreferencia", () => {
  it("cobra un solo ítem por el total calculado en el servidor, en COP", () => {
    const pref = construirPreferencia(cotizacion, "TS-1", "http://localhost:3000");
    expect(pref.items).toEqual([
      { id: "TS-1", title: "Pedido Toolshop TS-1", quantity: 1, unit_price: 121410, currency_id: "COP" },
    ]);
    expect(pref.external_reference).toBe("TS-1");
  });

  it("arma las back_urls con la URL base, sin barra final duplicada", () => {
    const pref = construirPreferencia(cotizacion, "TS-1", "https://tienda.vercel.app/");
    expect(pref.back_urls).toEqual({
      success: "https://tienda.vercel.app/pedido/exito",
      failure: "https://tienda.vercel.app/pedido/fallo",
      pending: "https://tienda.vercel.app/pedido/fallo",
    });
  });

  it("solo envía auto_return y notification_url con HTTPS", () => {
    const local = construirPreferencia(cotizacion, "TS-1", "http://localhost:3000");
    expect(local.auto_return).toBeUndefined();
    expect(local.notification_url).toBeUndefined();

    const publica = construirPreferencia(cotizacion, "TS-1", "https://tienda.vercel.app");
    expect(publica.auto_return).toBe("approved");
    expect(publica.notification_url).toBe("https://tienda.vercel.app/api/webhooks/mercadopago");
  });
});

describe("etiquetaEstado", () => {
  it("traduce los estados de Mercado Pago", () => {
    expect(etiquetaEstado("approved")).toBe("Aprobado");
    expect(etiquetaEstado("rejected")).toBe("Rechazado");
    expect(etiquetaEstado("otro")).toBe("Desconocido");
    expect(etiquetaEstado(undefined)).toBe("Desconocido");
  });
});
