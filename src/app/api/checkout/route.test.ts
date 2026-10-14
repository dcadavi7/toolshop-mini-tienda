import { beforeEach, describe, expect, it, vi } from "vitest";

const crearPreferencia = vi.fn();

vi.mock("@/lib/mercadopago", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/mercadopago")>();
  return { ...original, crearPreferencia };
});

const { POST } = await import("./route");

async function pagar(cuerpo: unknown) {
  const respuesta = await POST(
    new Request("http://localhost:3000/api/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: typeof cuerpo === "string" ? cuerpo : JSON.stringify(cuerpo),
    }),
  );
  return { status: respuesta.status, body: await respuesta.json() };
}

describe("POST /api/checkout", () => {
  beforeEach(() => {
    crearPreferencia.mockReset();
    vi.unstubAllEnvs();
    vi.stubEnv("NEXT_PUBLIC_BASE_URL", "http://localhost:3000");
  });

  it("crea la preferencia con el total del servidor e ignora los montos del navegador", async () => {
    crearPreferencia.mockResolvedValue({ checkoutUrl: "https://mp.test/checkout" });

    const { status, body } = await pagar({
      items: [{ productId: "claw-hammer", quantity: 2, unitPrice: 1 }],
      total: 1,
    });

    expect(status).toBe(200);
    expect(body.checkoutUrl).toBe("https://mp.test/checkout");
    expect(body.externalReference).toMatch(/^TS-\d{14}-[0-9A-F]{6}$/);
    const datos = crearPreferencia.mock.calls[0][0];
    expect(datos.items[0].unit_price).toBe(121410);
    expect(datos.external_reference).toBe(body.externalReference);
    expect(datos.back_urls.success).toBe("http://localhost:3000/pedido/exito");
  });

  it("responde 400 y no llama a Mercado Pago si el carrito no es válido", async () => {
    const { status, body } = await pagar({ items: [{ productId: "long-nose-pliers", quantity: 1 }] });
    expect(status).toBe(400);
    expect(body.error).toBe("El producto está agotado");
    expect(crearPreferencia).not.toHaveBeenCalled();
  });

  it("responde 400 si el cuerpo no es JSON", async () => {
    const { status } = await pagar("no es json");
    expect(status).toBe(400);
  });

  it("responde 502 con un mensaje genérico si Mercado Pago falla", async () => {
    crearPreferencia.mockRejectedValue(new Error("invalid access token xyz"));
    vi.spyOn(console, "error").mockImplementation(() => {});

    const { status, body } = await pagar({ items: [{ productId: "claw-hammer", quantity: 1 }] });

    expect(status).toBe(502);
    expect(body.error).not.toContain("token");
  });

  it("responde 500 nombrando la variable si falta el Access Token", async () => {
    const { ConfiguracionFaltanteError } = await import("@/lib/mercadopago");
    crearPreferencia.mockRejectedValue(new ConfiguracionFaltanteError("MP_ACCESS_TOKEN"));

    const { status, body } = await pagar({ items: [{ productId: "claw-hammer", quantity: 1 }] });

    expect(status).toBe(500);
    expect(body.error).toContain("MP_ACCESS_TOKEN");
  });
});
