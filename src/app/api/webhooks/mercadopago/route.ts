import { InvalidWebhookSignatureError, WebhookSignatureValidator } from "mercadopago";
import { ConfiguracionFaltanteError, consultarPago, leerVariable } from "@/lib/mercadopago";

const TOLERANCIA_SEGUNDOS = 600;

export async function POST(request: Request) {
  const url = new URL(request.url);
  const dataId = url.searchParams.get("data.id") ?? url.searchParams.get("id");
  const tipo = url.searchParams.get("type") ?? url.searchParams.get("topic");

  let secreto: string;
  try {
    secreto = leerVariable("MP_WEBHOOK_SECRET");
  } catch (error) {
    if (error instanceof ConfiguracionFaltanteError) {
      return Response.json({ error: error.message }, { status: 500 });
    }
    throw error;
  }

  try {
    WebhookSignatureValidator.validate({
      xSignature: request.headers.get("x-signature"),
      xRequestId: request.headers.get("x-request-id"),
      dataId,
      secret: secreto,
      toleranceSeconds: TOLERANCIA_SEGUNDOS,
    });
  } catch (error) {
    if (error instanceof InvalidWebhookSignatureError) {
      console.warn("[webhook] firma rechazada", {
        motivo: error.reason,
        requestId: error.requestId,
      });
      return Response.json({ error: "Firma inválida" }, { status: 401 });
    }
    throw error;
  }

  if (tipo !== "payment" || !dataId) {
    return Response.json({ recibido: true });
  }

  try {
    const pago = await consultarPago(dataId);
    if (pago.status === "approved") {
      // En el MVP no hay base de datos: el pedido queda registrado en el log del servidor.
      console.info("[pedido] pagado", {
        pedido: pago.externalReference,
        pago: pago.id,
        monto: pago.amount,
      });
    }
    return Response.json({ recibido: true });
  } catch (error) {
    console.error("[webhook] no se pudo consultar el pago", {
      pago: dataId,
      mensaje: error instanceof Error ? error.message : String(error),
    });
    // 500 hace que Mercado Pago reintente la notificación más tarde.
    return Response.json({ error: "No se pudo consultar el pago" }, { status: 500 });
  }
}
