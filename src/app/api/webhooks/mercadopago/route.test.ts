import { createHmac } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";

const consultarPago = vi.fn();

vi.mock("@/lib/mercadopago", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/mercadopago")>();
  return { ...original, consultarPago };
});

const { POST } = await import("./route");

const SECRETO = "secreto-de-prueba";

function firmar(dataId: string, requestId: string, ts: string, secreto = SECRETO) {
  const manifiesto = `id:${dataId};request-id:${requestId};ts:${ts};`;
  const v1 = createHmac("sha256", secreto).update(manifiesto).digest("hex");
  return `ts=${ts},v1=${v1}`;
}

function notificar(headers: Record<string, string>, dataId = "123456") {
  return POST(
    new Request(`https://tienda.test/api/webhooks/mercadopago?data.id=${dataId}&type=payment`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...headers },
      body: JSON.stringify({ type: "payment", action: "payment.updated", data: { id: dataId } }),
    }),
  );
}

describe("POST /api/webhooks/mercadopago", () => {
  beforeEach(() => {
    consultarPago.mockReset();
    vi.unstubAllEnvs();
    vi.stubEnv("MP_WEBHOOK_SECRET", SECRETO);
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.spyOn(console, "info").mockImplementation(() => {});
  });

  it("acepta una notificación con firma válida y registra el pago aprobado", async () => {
    consultarPago.mockResolvedValue({ id: "123456", status: "approved", externalReference: "TS-1", amount: 121410 });
    const ts = String(Math.floor(Date.now() / 1000));

    const respuesta = await notificar({ "x-signature": firmar("123456", "req-1", ts), "x-request-id": "req-1" });

    expect(respuesta.status).toBe(200);
    expect(consultarPago).toHaveBeenCalledWith("123456");
    expect(console.info).toHaveBeenCalledWith(
      "[pedido] pagado",
      expect.objectContaining({ pedido: "TS-1", monto: 121410 }),
    );
  });

  it("responde 401 si la firma no es válida", async () => {
    const ts = String(Math.floor(Date.now() / 1000));
    const respuesta = await notificar({
      "x-signature": firmar("123456", "req-1", ts, "otro-secreto"),
      "x-request-id": "req-1",
    });

    expect(respuesta.status).toBe(401);
    expect(consultarPago).not.toHaveBeenCalled();
  });

  it("responde 401 si falta la firma", async () => {
    const respuesta = await notificar({ "x-request-id": "req-1" });
    expect(respuesta.status).toBe(401);
  });

  it("responde 401 si la firma es de otro pago (data.id alterado)", async () => {
    const ts = String(Math.floor(Date.now() / 1000));
    const respuesta = await notificar(
      { "x-signature": firmar("999", "req-1", ts), "x-request-id": "req-1" },
      "123456",
    );
    expect(respuesta.status).toBe(401);
  });

  it("ignora con 200 las notificaciones IPN sin data.id, sin consultar el pago", async () => {
    const respuesta = await POST(
      new Request("https://tienda.test/api/webhooks/mercadopago?topic=merchant_order&id=1", { method: "POST" }),
    );
    expect(respuesta.status).toBe(200);
    expect(consultarPago).not.toHaveBeenCalled();
  });

  it("responde 200 sin procesar si el pago no existe (simulador del panel)", async () => {
    const { MPNotFoundError } = await import("mercadopago");
    consultarPago.mockRejectedValue(Object.create(MPNotFoundError.prototype));
    const ts = String(Math.floor(Date.now() / 1000));

    const respuesta = await notificar({ "x-signature": firmar("123456", "req-1", ts), "x-request-id": "req-1" });

    expect(respuesta.status).toBe(200);
    expect((await respuesta.json()).procesado).toBe(false);
  });

  it("responde 500 si falta la clave secreta", async () => {
    vi.stubEnv("MP_WEBHOOK_SECRET", "");
    const respuesta = await notificar({});
    expect(respuesta.status).toBe(500);
    expect((await respuesta.json()).error).toContain("MP_WEBHOOK_SECRET");
  });
});
