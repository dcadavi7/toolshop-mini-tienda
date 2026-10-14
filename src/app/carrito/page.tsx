import type { Metadata } from "next";
import { VistaCarrito } from "@/components/VistaCarrito";

export const metadata: Metadata = {
  title: "Carrito — Toolshop",
};

export default function CarritoPage() {
  return <VistaCarrito />;
}
