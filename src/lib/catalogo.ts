import catalogoJson from "@/data/products.json";
import type { Producto } from "@/lib/carrito";

export function obtenerCatalogo(): Producto[] {
  return catalogoJson as Producto[];
}
