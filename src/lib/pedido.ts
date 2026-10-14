import type { Cotizacion } from "@/lib/carrito";

export type DatosPreferencia = {
  items: Array<{
    id: string;
    title: string;
    quantity: number;
    unit_price: number;
    currency_id: "COP";
  }>;
  external_reference: string;
  back_urls: { success: string; failure: string; pending: string };
  auto_return?: "approved";
  notification_url?: string;
  statement_descriptor: string;
};

/** Referencia única del pedido: TS-AAAAMMDDhhmmss-XXXXXX. */
export function generarReferencia(
  ahora: Date = new Date(),
  aleatorio: string = crypto.randomUUID(),
): string {
  const fecha = ahora.toISOString().replace(/\D/g, "").slice(0, 14);
  return `TS-${fecha}-${aleatorio.replace(/-/g, "").slice(0, 6).toUpperCase()}`;
}

/**
 * Arma la preferencia de Checkout Pro con un solo ítem por el total calculado en el servidor.
 * auto_return y notification_url solo se envían con HTTPS: Mercado Pago no los acepta con localhost.
 */
export function construirPreferencia(
  cotizacion: Cotizacion,
  referencia: string,
  baseUrl: string,
): DatosPreferencia {
  const base = baseUrl.replace(/\/+$/, "");
  const preferencia: DatosPreferencia = {
    items: [
      {
        id: referencia,
        title: `Pedido Toolshop ${referencia}`,
        quantity: 1,
        unit_price: cotizacion.total,
        currency_id: "COP",
      },
    ],
    external_reference: referencia,
    back_urls: {
      success: `${base}/pedido/exito`,
      failure: `${base}/pedido/fallo`,
      pending: `${base}/pedido/fallo`,
    },
    statement_descriptor: "TOOLSHOP",
  };
  if (base.startsWith("https://")) {
    preferencia.auto_return = "approved";
    preferencia.notification_url = `${base}/api/webhooks/mercadopago`;
  }
  return preferencia;
}

const ESTADOS: Record<string, string> = {
  approved: "Aprobado",
  pending: "Pendiente",
  in_process: "En proceso",
  rejected: "Rechazado",
  cancelled: "Cancelado",
  refunded: "Reembolsado",
};

export function etiquetaEstado(estado: string | undefined): string {
  return (estado && ESTADOS[estado]) || "Desconocido";
}
