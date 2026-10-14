import { cotizarCarrito, validarItemsCotizacion } from "@/lib/carrito";
import { obtenerCatalogo } from "@/lib/catalogo";
import { ConfiguracionFaltanteError, crearPreferencia } from "@/lib/mercadopago";
import { construirPreferencia, generarReferencia } from "@/lib/pedido";

function errorJson(error: string, status: number) {
  return Response.json({ error }, { status });
}

export async function POST(request: Request) {
  let cuerpo: unknown;
  try {
    cuerpo = await request.json();
  } catch {
    return errorJson("El cuerpo de la solicitud no es válido", 400);
  }

  const catalogo = obtenerCatalogo();
  const validacion = validarItemsCotizacion(cuerpo, catalogo);
  if (!validacion.ok) {
    return errorJson(validacion.error, 400);
  }

  // El total sale siempre del servidor; los montos del navegador se ignoran.
  const cotizacion = cotizarCarrito(validacion.items, catalogo);
  const externalReference = generarReferencia();
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || new URL(request.url).origin;

  try {
    const { checkoutUrl } = await crearPreferencia(
      construirPreferencia(cotizacion, externalReference, baseUrl),
    );
    return Response.json({ checkoutUrl, externalReference });
  } catch (error) {
    if (error instanceof ConfiguracionFaltanteError) {
      return errorJson(error.message, 500);
    }
    console.error("[checkout] Mercado Pago rechazó la preferencia", {
      externalReference,
      mensaje: error instanceof Error ? error.message : String(error),
    });
    return errorJson("No se pudo iniciar el pago con Mercado Pago. Intenta de nuevo.", 502);
  }
}
