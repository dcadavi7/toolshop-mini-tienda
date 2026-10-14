import { obtenerCatalogo } from "@/lib/catalogo";

export async function GET() {
  return Response.json(obtenerCatalogo());
}
