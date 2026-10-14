import type { Metadata } from "next";
import { CarritoProvider } from "@/components/CarritoProvider";
import { Encabezado } from "@/components/Encabezado";
import "./globals.css";

export const metadata: Metadata = {
  title: "Toolshop — Mini tienda",
  description: "Mini tienda de herramientas Toolshop con pago en Mercado Pago (modo de prueba)",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es" className="h-full antialiased">
      <body className="flex min-h-full flex-col bg-gray-50 text-gray-900">
        <CarritoProvider>
          <Encabezado />
          <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">{children}</main>
        </CarritoProvider>
      </body>
    </html>
  );
}
