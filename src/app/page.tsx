import { BotonAgregar } from "@/components/BotonAgregar";
import { esEcologico, estaAgotado } from "@/lib/carrito";
import { obtenerCatalogo } from "@/lib/catalogo";
import { formatearCOP } from "@/lib/formato";

export default function CatalogoPage() {
  const productos = obtenerCatalogo();

  return (
    <section aria-labelledby="titulo-catalogo">
      <h1 id="titulo-catalogo" className="mb-6 text-2xl font-bold">
        Catálogo de herramientas
      </h1>
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {productos.map((producto) => {
          const agotado = estaAgotado(producto);
          return (
            <li
              key={producto.id}
              data-testid={`product-card-${producto.id}`}
              className="flex flex-col justify-between rounded-lg border border-gray-200 bg-white p-4 shadow-sm"
            >
              <div className="mb-4">
                <h2 className="text-base font-semibold">{producto.nombre}</h2>
                {esEcologico(producto) && (
                  <span
                    data-testid={`eco-badge-${producto.id}`}
                    className="mt-1 inline-block rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800"
                  >
                    Ecológico
                  </span>
                )}
                <p data-testid={`product-price-${producto.id}`} className="mt-2 text-lg font-bold">
                  {formatearCOP(producto.precio)}
                </p>
                <p data-testid={`product-stock-${producto.id}`} className="text-sm text-gray-600">
                  {agotado ? "Agotado" : `${producto.existencias} disponibles`}
                </p>
              </div>
              <BotonAgregar
                productId={producto.id}
                nombre={producto.nombre}
                agotado={agotado}
              />
            </li>
          );
        })}
      </ul>
    </section>
  );
}
