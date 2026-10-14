# SPEC — Mini tienda Toolshop (Actividad 4)

Especificación para el agente de Cursor. Todo lo que se genere debe cumplir este documento.
Si algo no está claro o choca con otra regla, el agente pregunta antes de inventar.

## 1. Objetivo

Una mini tienda web con el catálogo de herramientas de Toolshop, un carrito con las reglas
de la HU-02 (actividades 2 y 3) y pago con **Mercado Pago Checkout Pro** en modo de prueba.
Se despliega en Vercel y la prueba TestSprite de punta a punta.

## 2. Stack

- Next.js (App Router) + TypeScript estricto, carpeta `src/`, alias `@/*`.
- Tailwind CSS para estilos. Sin librerías de componentes.
- SDK oficial `mercadopago` (v3: `MercadoPagoConfig`, `Preference`, `Payment`, `WebhookSignatureValidator`).
- Vitest para pruebas unitarias y de las rutas de la API.
- Sin base de datos: el catálogo es `src/data/products.json`.
- npm como gestor de paquetes.

## 3. Catálogo

`src/data/products.json`, 8 productos. Precios en pesos colombianos (COP), enteros.

| id | nombre | precio (COP) | existencias | co2Rating |
|---|---|---|---|---|
| combination-pliers | Alicate de combinación | 52000 | 12 | A |
| bolt-cutters | Cortapernos | 189000 | 5 | C |
| long-nose-pliers | Alicate de punta larga | 41500 | 0 | B |
| claw-hammer | Martillo de uña | 63900 | 20 | B |
| thor-hammer | Martillo Thor | 459000 | 2 | E |
| wood-saw | Serrucho para madera | 78000 | 8 | A |
| sheet-sander | Lijadora orbital | 245000 | 4 | D |
| tape-measure | Flexómetro 5 m | 29900 | 30 | A |

- Un producto es **ecológico** si `co2Rating` es `A` o `B`.
- Un producto está **agotado** si `stock` es 0.

## 4. Reglas del carrito (`src/lib/carrito.ts`)

Funciones puras, sin acceso a red ni a `window`. Las usan la interfaz y la API.

1. Agregar un producto que ya está en el carrito suma la cantidad a la línea existente.
2. Subtotal de línea = precio × cantidad.
3. Cantidad mínima 1 y máxima 99. En la interfaz, un valor fuera de rango se ajusta al límite más cercano.
4. Un producto agotado no se puede agregar: la función lanza `ProductoAgotadoError`.
5. Subtotal del carrito = suma de los subtotales de línea.
6. **Descuento ecológico:** si **más del 50 %** de las unidades del carrito son ecológicas,
   descuento = 5 % del subtotal, redondeado al peso entero más cercano (mitades hacia arriba).
   Exactamente 50 % no da descuento.
7. Total = subtotal − descuento ecológico.
8. Toda la aritmética en enteros (pesos). Nada de `toFixed` para calcular.

## 5. Rutas y pantallas

| Ruta | Qué muestra |
|---|---|
| `/` | Catálogo: nombre, precio con formato COP, existencias, insignia "Ecológico", botón "Agregar". Si está agotado: texto "Agotado" y botón deshabilitado. Contador del carrito en el encabezado. |
| `/carrito` | Líneas con cantidad editable y botón eliminar; subtotal, descuento ecológico y total (los trae `POST /api/cart/quote`). Botón "Pagar". Carrito vacío: mensaje y enlace al catálogo. |
| `/pedido/exito` | Lee `payment_id` de la URL, consulta el pago a Mercado Pago **desde el servidor** y muestra número de pedido (`external_reference`), estado y total. Si el pago está aprobado, vacía el carrito. |
| `/pedido/fallo` | Pago rechazado o pendiente: mensaje claro y botón "Volver al carrito". El carrito **no** se vacía. |

El carrito se guarda en `localStorage` (clave `toolshop-carrito`) para que sobreviva a una recarga.
Solo se guardan `productId` y `quantity`; precios y totales siempre vienen del servidor.

## 6. API

Todas responden JSON. Los errores tienen la forma `{ "error": "mensaje claro en español" }`.

### `GET /api/products`
200 con la lista del catálogo.

### `POST /api/cart/quote`
Entrada: `{ "items": [ { "productId": "claw-hammer", "quantity": 2 } ] }`

Salida 200:
```json
{
  "lines": [{ "productId": "claw-hammer", "name": "Martillo de uña", "unitPrice": 63900, "quantity": 2, "lineTotal": 127800, "eco": true }],
  "subtotal": 127800,
  "ecoDiscount": 6390,
  "total": 121410
}
```
Responde **400** si: el cuerpo no es válido, `items` está vacío, un `productId` no existe,
una cantidad no es entera o está fuera de 1–99, o un producto está agotado.

### `POST /api/checkout`
Entrada: igual que `/api/cart/quote`. El servidor **recalcula** el total con `src/lib/carrito.ts`;
nunca acepta precios ni totales del navegador.

Crea una preferencia de Checkout Pro:
- Un solo ítem: título `Pedido Toolshop <external_reference>`, `quantity: 1`,
  `unit_price: total`, `currency_id: "COP"`.
- `external_reference`: identificador único del pedido (por ejemplo `TS-` + fecha + aleatorio).
- `back_urls`: `success` → `/pedido/exito`, `failure` → `/pedido/fallo`, `pending` → `/pedido/fallo`,
  todas construidas con `NEXT_PUBLIC_BASE_URL`.
- `auto_return: "approved"` **solo si** la URL base empieza por `https://` (Mercado Pago no lo acepta con `localhost`).
- Sin `notification_url`: las notificaciones llegan solo por el webhook configurado en el panel de Mercado Pago
  (firmado con la clave secreta). Así hay una sola fuente de avisos, todos firmados.

Salida 200: `{ "checkoutUrl": "<init_point>", "externalReference": "TS-..." }`. Mismos 400 que el quote.
Si Mercado Pago falla: 502 con mensaje genérico (sin filtrar detalles internos).

### `POST /api/webhooks/mercadopago`
1. Valida la firma del encabezado `x-signature` (`ts=...,v1=...`) con `x-request-id`:
   manifiesto `id:<data.id>;request-id:<x-request-id>;ts:<ts>;`, HMAC-SHA256 con
   `MP_WEBHOOK_SECRET`, comparación en tiempo constante. `data.id` sale del query string.
2. Firma ausente o inválida → **401**.
3. Si el tipo es `payment`, consulta el pago con el SDK y, si está `approved`, registra el pedido
   en el log del servidor (`external_reference`, id del pago, monto). En el MVP no hay base de datos.
4. Responde 200 rápido. Cualquier otro tipo de evento, las notificaciones IPN sin `data.id` y los pagos
   inexistentes (simulador del panel) → 200 sin procesar.

## 7. Variables de entorno

| Variable | Uso |
|---|---|
| `MP_ACCESS_TOKEN` | Access Token **de prueba** de Mercado Pago (solo servidor) |
| `MP_WEBHOOK_SECRET` | Clave secreta de las notificaciones (solo servidor) |
| `NEXT_PUBLIC_BASE_URL` | URL base de la app (`http://localhost:3000` en local, la de Vercel en producción) |

- Viven en `.env.local` (ignorado por Git) y en Vercel. Nunca en el código ni en commits.
- Crear `.env.example` con los nombres y valores vacíos.
- Si falta una variable, la ruta responde 500 con un mensaje que nombre la variable, sin mostrar valores.

## 8. Reglas de testabilidad (obligatorias)

Para que las pruebas generadas por TestSprite sean estables:

- Cada elemento interactivo o con datos verificables tiene `data-testid`:
  - Catálogo: `product-card-<id>`, `product-price-<id>`, `product-stock-<id>`, `eco-badge-<id>`, `add-to-cart-<id>`, `cart-count`.
  - Carrito: `cart-line-<id>`, `qty-input-<id>`, `remove-<id>`, `cart-subtotal`, `cart-eco-discount`, `cart-total`, `checkout-button`, `cart-empty`.
  - Resultado: `order-reference`, `order-status`, `order-total`, `back-to-cart`, `payment-unconfirmed`, `payment-failed`.
  - Errores: `cart-error` (cotización) y `checkout-error` (inicio del pago).
- Usar elementos semánticos y roles accesibles (`button`, `link`, `heading`, `label` asociado a cada input).
- Los montos se muestran con `Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 })`.
- Mientras se calcula o se crea el pago, el botón muestra estado de carga y queda deshabilitado
  (evita doble clic y da a las pruebas un estado que esperar).
- Errores visibles en un elemento con `role="alert"` y su `data-testid`. Ojo: Next.js agrega su propio `role="alert"` (`__next-route-announcer__`), así que las pruebas no deben buscar solo por el rol.

## 9. Pruebas y calidad

- `src/lib/carrito.test.ts`: todas las reglas de la sección 4, con los casos límite
  (1 y 99, 0 y 100, exactamente 50 % ecológico, 51 %, redondeo del descuento, producto agotado).
- Pruebas de las rutas `quote`, `checkout` (con el SDK simulado) y `webhook` (firma válida, inválida y ausente).
- Scripts en `package.json`: `dev`, `build`, `start`, `lint`, `test` (`vitest run`), `test:coverage`.
- `npm run lint`, `npm run build` y `npm test` deben pasar sin errores antes de cada entrega.

## 10. Fuera de alcance

Usuarios y login, base de datos, inventario que se descuenta al pagar, envíos, impuestos, idiomas.
