import { cotizarCarrito, validarItemsCotizacion } from "@/lib/carrito";
import { obtenerCatalogo } from "@/lib/catalogo";

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

  return Response.json(cotizarCarrito(validacion.items, catalogo));
}
