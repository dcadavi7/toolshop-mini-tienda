import { InvalidWebhookSignatureError, MPNotFoundError, WebhookSignatureValidator } from "mercadopago";
import { ConfiguracionFaltanteError, consultarPago, leerVariable } from "@/lib/mercadopago";

const TOLERANCIA_SEGUNDOS = 600;

function edadFirma(xSignature: string | null): number | undefined {
  const ts = xSignature?.match(/ts=(\d+)/)?.[1];
  if (!ts) return undefined;
  const segundos = ts.length > 10 ? Number(ts) / 1000 : Number(ts);
  return Math.round(Date.now() / 1000 - segundos);
}

export async function POST(request: Request) {
  const url = new URL(request.url);
  const dataId = url.searchParams.get("data.id");
  const tipo = url.searchParams.get("type") ?? url.searchParams.get("topic");

  // Formato IPN antiguo (?topic=...&id=...): no viene firmado con la clave secreta.
  // No se usa para nada, así que se confirma la recepción sin procesarlo.
  if (!dataId) {
    console.info("[webhook] notificación sin data.id ignorada", { tipo });
    return Response.json({ recibido: true, procesado: false });
  }

  let secreto: string;
  try {
    secreto = leerVariable("MP_WEBHOOK_SECRET");
  } catch (error) {
    if (error instanceof ConfiguracionFaltanteError) {
      return Response.json({ error: error.message }, { status: 500 });
    }
    throw error;
  }

  const xSignature = request.headers.get("x-signature");
  try {
    WebhookSignatureValidator.validate({
      xSignature,
      xRequestId: request.headers.get("x-request-id"),
      dataId,
      secret: secreto,
      toleranceSeconds: TOLERANCIA_SEGUNDOS,
    });
  } catch (error) {
    if (error instanceof InvalidWebhookSignatureError) {
      // Diagnóstico sin datos sensibles: nunca se registra la clave ni la firma.
      console.warn("[webhook] firma rechazada", {
        motivo: error.reason,
        requestId: error.requestId,
        tipo,
        dataId,
        edadFirmaSegundos: edadFirma(xSignature),
        parametros: [...url.searchParams.keys()],
      });
      return Response.json({ error: "Firma inválida" }, { status: 401 });
    }
    throw error;
  }

  if (tipo !== "payment") {
    return Response.json({ recibido: true, procesado: false });
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
    } else {
      console.info("[pedido] notificación de pago no aprobado", { pago: pago.id, estado: pago.status });
    }
    return Response.json({ recibido: true, procesado: true });
  } catch (error) {
    if (error instanceof MPNotFoundError) {
      // Pasa con las notificaciones de prueba del simulador del panel (id ficticio).
      console.info("[webhook] pago no encontrado en Mercado Pago", { pago: dataId });
      return Response.json({ recibido: true, procesado: false });
    }
    console.error("[webhook] no se pudo consultar el pago", {
      pago: dataId,
      mensaje: error instanceof Error ? error.message : String(error),
    });
    // 500 hace que Mercado Pago reintente la notificación más tarde.
    return Response.json({ error: "No se pudo consultar el pago" }, { status: 500 });
  }
}
